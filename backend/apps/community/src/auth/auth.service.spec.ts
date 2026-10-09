import { createHash } from 'crypto'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'

jest.mock('../common/constants', () => ({
  REDIS_OIDC_SESSION_KEY: 'oidc:session',
  redis: { get: jest.fn(), set: jest.fn(), exists: jest.fn(), del: jest.fn() },
}))
jest.mock('../common/utils', () => ({}))
jest.mock('../user/user.service', () => ({ UserService: class {} }))
jest.mock('../mailer/mailer.service', () => ({ MailerService: class {} }))

import { redis } from '../common/constants'
import { AuthService } from './auth.service'

const issuer = 'https://identity.example.com/auth/v1'
const redirectUrl = 'https://analytics.example.com/socialised'
const discovery = {
  issuer,
  authorization_endpoint: `${issuer}/authorize`,
  token_endpoint: `${issuer}/token`,
  jwks_uri: `${issuer}/certs`,
  code_challenge_methods_supported: ['S256'],
}
const config: Record<string, string> = {
  OIDC_CLIENT_ID: 'swetrix',
  OIDC_CLIENT_SECRET: 'test-secret',
}

function setup() {
  const sessions = new Map<string, string>()
  jest
    .mocked(redis.get)
    .mockImplementation(async (key) => sessions.get(String(key)) ?? null)
  jest.mocked(redis.set).mockImplementation(async (key, value) => {
    sessions.set(String(key), String(value))
    return 'OK'
  })
  jest
    .mocked(redis.exists)
    .mockImplementation(async (key) => Number(sessions.has(String(key))))
  jest
    .mocked(redis.del)
    .mockImplementation(async (key) => Number(sessions.delete(String(key))))
  const users = {
    findOne: jest.fn().mockResolvedValue({ id: 'user-id' }),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockResolvedValue({ id: 'user-id' }),
  }
  const service = new AuthService(
    { get: (key: string) => config[key] } as ConfigService,
    {} as JwtService,
    users as any,
    {} as any,
  )
  jest.spyOn(service, 'getOidcDiscovery').mockResolvedValue(discovery)
  return { service, sessions, users }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

describe('OIDC ID tokens', () => {
  let service: AuthService
  let signToken: (claims?: Record<string, unknown>) => Promise<string>

  beforeEach(async () => {
    service = setup().service
    const { privateKey, publicKey } = await generateKeyPair('EdDSA')
    const jwk = {
      ...(await exportJWK(publicKey)),
      kid: 'ed25519',
      alg: 'EdDSA',
      use: 'sig',
    }
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ keys: [jwk] }))
    signToken = (claims = {}) =>
      new SignJWT({
        iss: issuer,
        sub: 'rauthy-user',
        aud: config.OIDC_CLIENT_ID,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300,
        email: 'user@example.com',
        ...claims,
      })
        .setProtectedHeader({ alg: 'EdDSA', kid: 'ed25519' })
        .sign(privateKey)
  })

  it('accepts a signed EdDSA ID token', async () => {
    await expect(
      service.getIdToken({ id_token: await signToken() }, discovery),
    ).resolves.toMatchObject({ sub: 'rauthy-user', email: 'user@example.com' })
  })

  it.each(['RS256', 'RS512'])(
    'continues to accept %s ID tokens',
    async (alg) => {
      const { privateKey, publicKey } = await generateKeyPair(alg)
      jest.mocked(fetch).mockResolvedValue(
        Response.json({
          keys: [
            { ...(await exportJWK(publicKey)), kid: 'rsa', alg, use: 'sig' },
          ],
        }),
      )
      const token = await new SignJWT({ email: 'user@example.com' })
        .setProtectedHeader({ alg, kid: 'rsa' })
        .setIssuer(issuer)
        .setSubject('rauthy-user')
        .setAudience(config.OIDC_CLIENT_ID)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(privateKey)
      await expect(
        service.getIdToken({ id_token: token }, discovery),
      ).resolves.toMatchObject({ sub: 'rauthy-user' })
    },
  )

  it.each([
    { iss: 'https://wrong-issuer.example.com' },
    { aud: 'another-client' },
    { exp: 1 },
    { exp: undefined },
    { iat: undefined },
    { iat: Math.floor(Date.now() / 1000) + 600 },
    { sub: undefined },
  ])('rejects invalid claims: %j', async (claims) => {
    await expect(
      service.getIdToken({ id_token: await signToken(claims) }, discovery),
    ).rejects.toThrow()
  })

  it('rejects a token signed by a different key', async () => {
    const { publicKey } = await generateKeyPair('EdDSA')
    jest.mocked(fetch).mockResolvedValue(
      Response.json({
        keys: [
          {
            ...(await exportJWK(publicKey)),
            kid: 'ed25519',
            alg: 'EdDSA',
            use: 'sig',
          },
        ],
      }),
    )
    await expect(
      service.getIdToken({ id_token: await signToken() }, discovery),
    ).rejects.toThrow('Invalid ID token')
  })
})

describe('OIDC callback', () => {
  it('completes a PKCE login with an EdDSA ID token and an RS512 access token', async () => {
    const { service, sessions, users } = setup()
    users.findOne.mockResolvedValue(null)
    jest.spyOn(service, 'hashPassword').mockResolvedValue('hashed-password')
    jest.spyOn(service, 'assignUnassignedProjectsToUser').mockResolvedValue()
    const { privateKey, publicKey } = await generateKeyPair('EdDSA')
    const rsa = await generateKeyPair('RS512')
    const idToken = await new SignJWT({ email: 'user@example.com' })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'id-key' })
      .setIssuer(issuer)
      .setSubject('rauthy-user')
      .setAudience(config.OIDC_CLIENT_ID)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey)
    const accessToken = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS512', kid: 'access-key' })
      .sign(rsa.privateKey)
    const jwk = {
      ...(await exportJWK(publicKey)),
      alg: 'EdDSA',
      kid: 'id-key',
      use: 'sig',
    }
    const { uuid, auth_url } = await service.generateOidcAuthUrl(redirectUrl)
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      if (String(url) === discovery.jwks_uri) {
        return Response.json({ keys: [jwk] })
      }
      expect(String(url)).toBe(discovery.token_endpoint)
      const verifier = new URLSearchParams(options.body as string).get(
        'code_verifier',
      )
      expect(createHash('sha256').update(verifier).digest('base64url')).toBe(
        new URL(auth_url).searchParams.get('code_challenge'),
      )
      return Response.json({ id_token: idToken, access_token: accessToken })
    })
    await service.processOidcToken('auth-code', uuid, redirectUrl)
    expect(users.create).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'hashed-password',
    })
    expect(JSON.parse(sessions.get(`oidc:session:${uuid}`))).toEqual({
      id: 'user-id',
    })
  })

  it('keeps a rejected token exchange pending', async () => {
    const { service } = setup()
    const { uuid } = await service.generateOidcAuthUrl(redirectUrl)
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json({ message: 'Bad request' }, { status: 400 }),
      )
    const validateToken = jest.spyOn(service, 'getIdToken')
    await expect(
      service.processOidcToken('code', uuid, redirectUrl),
    ).rejects.toThrow()
    expect(validateToken).not.toHaveBeenCalled()
    expect(await service.isOidcSessionReady(uuid)).toBe(false)
  })
})

describe('OIDC PKCE sessions', () => {
  it('binds S256 to the session and sends its verifier during code exchange', async () => {
    const { service, sessions, users } = setup()
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ id_token: 'token' }))
    jest
      .spyOn(service, 'getIdToken')
      .mockResolvedValue({ email: 'USER@example.com' })
    const { auth_url, uuid } = await service.generateOidcAuthUrl(redirectUrl)
    const params = new URL(auth_url).searchParams
    const session = JSON.parse(sessions.get(`oidc:session:${uuid}`))

    expect(session.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(params.get('code_challenge_method')).toBe('S256')
    expect(params.get('code_challenge')).toBe(
      createHash('sha256').update(session.codeVerifier).digest('base64url'),
    )
    expect(params.has('code_verifier')).toBe(false)
    expect(await service.isOidcSessionReady(uuid)).toBe(false)
    await expect(service.processHash(uuid)).rejects.toThrow('no data found')
    expect(sessions.has(`oidc:session:${uuid}`)).toBe(true)

    await service.processOidcToken('auth-code', uuid, redirectUrl)
    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body as string)
    expect(body.get('code_verifier')).toBe(session.codeVerifier)
    expect(body.get('redirect_uri')).toBe(redirectUrl)
    expect(body.get('client_secret')).toBe('test-secret')
    expect(users.findOne).toHaveBeenCalledWith({ email: 'user@example.com' })
    expect(await service.isOidcSessionReady(uuid)).toBe(true)
    await service.processOidcToken('auth-code', uuid, redirectUrl)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await expect(service.processHash(uuid)).resolves.toEqual({ id: 'user-id' })
    expect(sessions.has(`oidc:session:${uuid}`)).toBe(false)
  })

  it('rejects a changed redirect URL before exchanging the code', async () => {
    const { service } = setup()
    const fetchMock = jest.spyOn(globalThis, 'fetch')
    const { uuid } = await service.generateOidcAuthUrl(redirectUrl)
    await expect(
      service.processOidcToken('code', uuid, 'https://other.example.com'),
    ).rejects.toThrow('Invalid redirect URL')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await service.isOidcSessionReady(uuid)).toBe(false)
  })

  it('rejects an unknown session before exchanging the code', async () => {
    const { service } = setup()
    const fetchMock = jest.spyOn(globalThis, 'fetch')
    await expect(
      service.processOidcToken('code', 'missing', redirectUrl),
    ).rejects.toThrow('No authentication session')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('supports providers without S256 support and legacy pending sessions', async () => {
    const { service, sessions } = setup()
    jest.mocked(service.getOidcDiscovery).mockResolvedValue({
      ...discovery,
      code_challenge_methods_supported: undefined,
    })
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => Response.json({ id_token: 'token' }))
    jest
      .spyOn(service, 'getIdToken')
      .mockResolvedValue({ email: 'user@example.com' })
    const { auth_url, uuid } = await service.generateOidcAuthUrl(redirectUrl)
    expect(new URL(auth_url).searchParams.has('code_challenge')).toBe(false)
    await service.processOidcToken('code', uuid, redirectUrl)
    expect(
      new URLSearchParams(fetchMock.mock.calls[0][1].body as string).has(
        'code_verifier',
      ),
    ).toBe(false)
    sessions.set('oidc:session:legacy', '')
    await service.processOidcToken('code', 'legacy', redirectUrl)
    expect(await service.isOidcSessionReady('legacy')).toBe(true)
  })
})
