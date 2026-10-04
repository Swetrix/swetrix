import { AuthGuard } from '@nestjs/passport'
import { ApiKeyStrategy } from '../auth/strategies/api-key.strategy'
import 'reflect-metadata'
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { createDecipheriv, hkdfSync } from 'crypto'

jest.mock('./api-key.store', () => ({ ApiKeyStore: class {} }))
jest.mock('../common/constants', () => ({}))
import { ApiKeyService } from './api-key.service'
import { ApiKeyGuard } from './api-key.guard'
import { ApiKeyRecord, ApiKeyPolicy } from './api-key.types'
import { SaveApiKeyDto } from './api-key.dto'
import { decryptApiKey, encryptApiKey, generateApiKey } from './api-key.crypto'

const projectA = 'aaaaaaaaaaaa'
const projectB = 'bbbbbbbbbbbb'
const userId = 'owner'
const secretBase = process.env.SECRET_KEY_BASE
beforeAll(() => {
  process.env.SECRET_KEY_BASE = 'test-secret-only-for-api-key-specs'
})
afterAll(() => {
  if (secretBase === undefined) delete process.env.SECRET_KEY_BASE
  else process.env.SECRET_KEY_BASE = secretBase
})

function setup() {
  const records = new Map<string, ApiKeyRecord>()
  const users = new Map<string, any>([
    [
      userId,
      { id: userId, email: 'owner@example.com', apiKey: 'old-uuid-key' },
    ],
  ])
  const store = {
    list: jest.fn(async (uid: string) =>
      [...records.values()].filter((key) => key.userId === uid),
    ),
    get: jest.fn(async (uid: string, id: string) => {
      const key = records.get(id)
      return key?.userId === uid ? key : undefined
    }),
    insert: jest.fn(async (key: ApiKeyRecord) => {
      records.set(key.id, key)
    }),
    update: jest.fn(async (key: ApiKeyRecord) => {
      records.set(key.id, key)
    }),
    remove: jest.fn(async (_uid: string, id: string) => {
      records.delete(id)
    }),
    findByHash: jest.fn(async (hash: string) =>
      [...records.values()].find((key) => key.keyHash === hash),
    ),
    userById: jest.fn(async (id: string) => users.get(id)),
    legacyUser: jest.fn(async (secret: string) =>
      [...users.values()].find((user) => user.apiKey === secret),
    ),
    clearLegacy: jest.fn(async (id: string) => {
      users.get(id).apiKey = null
    }),
    replaceLegacy: jest.fn(async (key: ApiKeyRecord) => {
      users.get(key.userId).apiKey = null
      records.set(key.id, key)
    }),
    ownedProjects: jest.fn(async () => [
      { id: projectA, name: 'A' },
      { id: projectB, name: 'B' },
    ]),
    resourceProject: jest.fn(async () => projectB),
    projectUsers: jest.fn(async () => [...users.values()]),
  }
  const service = new ApiKeyService(store as any)
  return { service, store, records, users }
}
const input = (): SaveApiKeyDto => ({
  name: 'Reporting',
  scopes: ['analytics:read'],
  allProjects: false,
  projectIds: [projectA],
})

function context(policy: ApiKeyPolicy | undefined, key: any, values: any = {}) {
  const request = {
    user: key ? { id: userId, apiKeyAccess: key } : { id: userId },
    params: {},
    query: {},
    body: {},
    ...values,
  }
  const ctx = {
    getHandler: () => null,
    switchToHttp: () => ({ getRequest: () => request }),
  }
  const reflector = { get: () => policy } as unknown as Reflector
  return { request, ctx, reflector }
}
const scoped = () => ({
  id: 'key',
  scopes: ['analytics:read'],
  projectIds: [projectA],
  allProjects: false,
  unrestricted: false,
})

describe('scoped API keys', () => {
  it('generates prefixed independent 256-bit secrets and authenticated ciphertext', () => {
    const secret = generateApiKey()
    expect(secret).toMatch(/^swx_[a-f0-9]{64}$/)
    expect(generateApiKey()).not.toBe(secret)
    const cipher = encryptApiKey(secret, userId, 'id')
    expect(cipher).not.toContain(secret)
    expect(decryptApiKey(cipher, userId, 'id')).toBe(secret)
    expect(() => decryptApiKey(cipher, 'other', 'id')).toThrow()
    expect(() => decryptApiKey(cipher, userId, 'other')).toThrow()

    const derivedKey = Buffer.from(
      hkdfSync('sha256', process.env.SECRET_KEY_BASE, '', 'api-key', 32),
    )
    const [iv, tag, encrypted] = cipher
      .split('.')
      .map((part) => Buffer.from(part, 'base64'))
    const decipher = createDecipheriv('aes-256-gcm', derivedKey, iv)
    decipher.setAAD(Buffer.from(`${userId}:id`))
    decipher.setAuthTag(tag)
    expect(
      Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
        'utf8',
      ),
    ).toBe(secret)
  })

  it('requires a base secret even in test environments', () => {
    const cipher = encryptApiKey('secret', userId, 'id')
    const base = process.env.SECRET_KEY_BASE
    delete process.env.SECRET_KEY_BASE
    try {
      expect(() => encryptApiKey('secret', userId, 'id')).toThrow(
        'SECRET_KEY_BASE is required',
      )
      expect(() => decryptApiKey(cipher, userId, 'id')).toThrow(
        'SECRET_KEY_BASE is required',
      )
    } finally {
      process.env.SECRET_KEY_BASE = base
    }
  })

  it('lists metadata without secrets and reveals only to the owner', async () => {
    const { service } = setup()
    const result = await service.create(userId, input())
    expect(JSON.stringify(await service.list(userId))).not.toContain(
      result.secret,
    )
    expect(JSON.stringify(await service.list(userId))).not.toContain('keyHash')
    expect(JSON.stringify(await service.list(userId))).not.toContain(
      'encryptedKey',
    )
    expect(await service.reveal(userId, result.key.id)).toEqual({
      secret: result.secret,
    })
    await expect(service.reveal('other', result.key.id)).rejects.toThrow()
    await expect(service.rotate('other', result.key.id)).rejects.toThrow()
    await expect(service.remove('other', result.key.id)).rejects.toThrow()
  })

  it('rotates and revokes immediately while preserving scope and creation date', async () => {
    const { service, records } = setup()
    const first = await service.create(userId, input())
    const second = await service.rotate(userId, first.key.id)
    expect(second.key.created).toBe(first.key.created)
    expect(second.key.scopes).toEqual(first.key.scopes)
    expect(second.key.projectIds).toEqual(first.key.projectIds)
    await expect(service.authenticate(first.secret)).rejects.toThrow(
      UnauthorizedException,
    )
    expect((await service.authenticate(second.secret)).apiKeyAccess.id).toBe(
      first.key.id,
    )
    await service.remove(userId, first.key.id)
    expect(records.size).toBe(0)
    await expect(service.authenticate(second.secret)).rejects.toThrow(
      UnauthorizedException,
    )
  })

  it('preserves old UUID keys, including unrestricted rotation', async () => {
    const { service } = setup()
    expect(
      (await service.authenticate('old-uuid-key')).apiKeyAccess.unrestricted,
    ).toBe(true)
    const rotated = await service.rotate(userId, 'legacy')
    expect(rotated.key.unrestricted).toBe(true)
    expect(rotated.key.allProjects).toBe(true)
    await expect(service.authenticate('old-uuid-key')).rejects.toThrow()
    expect(
      (await service.authenticate(rotated.secret)).apiKeyAccess.unrestricted,
    ).toBe(true)
  })

  it('can restrict an old key without requiring the caller to change its secret', async () => {
    const { service } = setup()
    await service.update(userId, 'legacy', input())
    const principal = (await service.authenticate('old-uuid-key')).apiKeyAccess
    expect(principal.unrestricted).toBe(false)
    expect(principal.projectIds).toEqual([projectA])
    expect(principal.scopes).toEqual(['analytics:read'])
  })

  it('rejects arbitrary projects and empty permission sets', async () => {
    const { service } = setup()
    await expect(
      service.create(userId, { ...input(), projectIds: ['cccccccccccc'] }),
    ).rejects.toThrow(ForbiddenException)
    await expect(
      service.create(userId, { ...input(), scopes: [] }),
    ).rejects.toThrow()
    await expect(
      service.create(userId, { ...input(), projectIds: [] }),
    ).rejects.toThrow()
  })

  it('grants read alongside write and rejects unsupported write scopes', async () => {
    const { service } = setup()
    const { key } = await service.create(userId, {
      ...input(),
      scopes: ['projects:write'],
    })
    expect(key.scopes).toEqual(
      expect.arrayContaining(['projects:read', 'projects:write']),
    )
    expect(
      await validate(
        plainToInstance(SaveApiKeyDto, {
          ...input(),
          scopes: ['analytics:write'],
        }),
      ),
    ).not.toHaveLength(0)
    expect(
      await validate(
        plainToInstance(SaveApiKeyDto, { ...input(), allProjects: 'true' }),
      ),
    ).not.toHaveLength(0)
    expect(
      await validate(
        plainToInstance(SaveApiKeyDto, {
          ...input(),
          projectIds: ['abc-def12345'],
        }),
      ),
    ).toHaveLength(0)
  })

  it('shows inherited legacy access in project settings without exposing another owner secret', async () => {
    const { service, users } = setup()
    users.set('teammate', {
      id: 'teammate',
      email: 'team@example.com',
      apiKey: 'another-secret',
    })
    const list = await service.list(userId, projectA)
    expect(list.keys).toHaveLength(2)
    expect(JSON.stringify(list)).not.toContain('another-secret')
    expect(list.keys[1]).toMatchObject({
      owner: 'team@example.com',
      unrestricted: true,
    })
    await expect(service.list(userId, 'cccccccccccc')).rejects.toThrow(
      ForbiddenException,
    )
  })
})

describe('API key authorization', () => {
  async function run(
    policy: ApiKeyPolicy | undefined,
    key = scoped(),
    values = {},
  ) {
    const { service, store } = setup()
    const { ctx, reflector, request } = context(policy, key, values)
    const result = await new ApiKeyGuard(reflector, service).canActivate(
      ctx as any,
    )
    return { result, request, store }
  }
  const read: ApiKeyPolicy = {
    scope: 'analytics:read',
    source: 'query',
    field: 'pid',
  }

  it('allows only explicitly scoped projects, including for public routes', async () => {
    expect(
      (await run(read, scoped(), { query: { pid: projectA } })).result,
    ).toBe(true)
    await expect(
      run(read, scoped(), { query: { pid: projectB } }),
    ).rejects.toThrow(ForbiddenException)
    await expect(run(read, scoped(), { query: {} })).rejects.toThrow(
      ForbiddenException,
    )
    await expect(
      run(read, scoped(), { query: { pid: [projectA] } }),
    ).rejects.toThrow(ForbiddenException)
  })
  it('denies unannotated endpoints and writes with a read-only key', async () => {
    await expect(run(undefined)).rejects.toThrow(ForbiddenException)
    await expect(run({ ...read, scope: 'projects:write' })).rejects.toThrow(
      ForbiddenException,
    )
  })
  it('validates every project in JSON and array batch queries', async () => {
    expect(
      (
        await run(read, scoped(), {
          query: { pids: JSON.stringify([projectA]) },
        })
      ).result,
    ).toBe(true)
    await expect(
      run(read, scoped(), {
        query: { pids: JSON.stringify([projectA, projectB]) },
      }),
    ).rejects.toThrow()
    await expect(
      run(read, scoped(), { query: { pids: [projectA, projectB] } }),
    ).rejects.toThrow()
    await expect(
      run(read, scoped(), { query: { pids: '{}' } }),
    ).rejects.toThrow()
  })
  it('resolves resource IDs from storage and ignores spoofed project query parameters', async () => {
    for (const source of ['goal', 'flag', 'export'] as const) {
      await expect(
        run({ ...read, source, field: 'id' }, scoped(), {
          params: { id: 'resource-on-B' },
          query: { pid: projectA },
        }),
      ).rejects.toThrow(ForbiddenException)
    }
  })
  it('limits project lists before the controller runs', async () => {
    const { request } = await run({ ...read, source: 'list' })
    expect((request as any).apiKeyProjectIds).toEqual([projectA])
  })
  it('requires all-project access for account-wide operations', async () => {
    await expect(run({ ...read, source: 'account' })).rejects.toThrow()
    expect(
      (
        await run(
          { ...read, source: 'account' },
          { ...scoped(), allProjects: true },
        )
      ).result,
    ).toBe(true)
  })
  it('never grants new scoped keys access to a project the owner no longer owns', async () => {
    const { service, store } = setup()
    store.ownedProjects.mockResolvedValue([])
    const { reflector, ctx } = context(
      read,
      { ...scoped(), allProjects: true },
      { query: { pid: projectA } },
    )
    await expect(
      new ApiKeyGuard(reflector, service).canActivate(ctx as any),
    ).rejects.toThrow()
  })
  it('does not apply API-key restrictions to sessions or existing unrestricted keys', async () => {
    expect((await run(undefined, null)).result).toBe(true)
    expect(
      (await run(undefined, { ...scoped(), unrestricted: true })).result,
    ).toBe(true)
  })
  it('requires error permission for polymorphic dimension queries', async () => {
    await expect(
      run(read, scoped(), { query: { pid: projectA, type: 'errors' } }),
    ).rejects.toThrow()
  })
  it('requires every permission for combined responses', async () => {
    const combined = {
      ...read,
      requires: ['events:read', 'errors:read'] as const,
    }
    await expect(
      run(combined as any, scoped(), { query: { pid: projectA } }),
    ).rejects.toThrow()
    expect(
      (
        await run(
          combined as any,
          {
            ...scoped(),
            scopes: ['analytics:read', 'events:read', 'errors:read'],
          },
          { query: { pid: projectA } },
        )
      ).result,
    ).toBe(true)
  })
  it('cannot use custom event filters or discovery to bypass event permissions', async () => {
    for (const query of [
      { pid: projectA, type: 'ev' },
      {
        pid: projectA,
        filters: JSON.stringify([{ column: 'ev', filter: 'signup' }]),
      },
      {
        pid: projectA,
        filters: JSON.stringify([
          { dimension: 'event_metadata', key: 'email', value: 'test' },
        ]),
      },
    ])
      await expect(run(read, scoped(), { query })).rejects.toThrow()
  })
})

describe('Passport API key integration', () => {
  it('authenticates prefixed and existing secrets through the real strategy', async () => {
    const { service } = setup()
    new ApiKeyStrategy(service)
    const { secret } = await service.create(userId, input())
    const Guard = AuthGuard('api-key')
    for (const token of [secret, 'old-uuid-key']) {
      const request: any = { headers: { 'x-api-key': token } }
      const ctx: any = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({}),
        }),
      }
      expect(await new Guard().canActivate(ctx)).toBe(true)
      expect(request.user.id).toBe(userId)
      expect(request.user.apiKeyAccess.unrestricted).toBe(
        token === 'old-uuid-key',
      )
    }
    const ctx: any = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-api-key': 'invalid' } }),
        getResponse: () => ({}),
      }),
    }
    await expect(new Guard().canActivate(ctx)).rejects.toThrow(
      UnauthorizedException,
    )
  })
})
