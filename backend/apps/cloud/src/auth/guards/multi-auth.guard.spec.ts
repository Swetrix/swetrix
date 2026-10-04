import passport from 'passport'
import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

jest.mock('../decorators', () => ({
  IS_OPTIONAL_AUTH_KEY: 'isOptionalAuth',
}))

import { MultiAuthGuard } from './multi-auth.guard'

const createContext = (
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {},
) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ headers, cookies }),
    }),
  }) as unknown as ExecutionContext

describe('MultiAuthGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(() => true),
  } as unknown as Reflector

  it('allows anonymous requests on optional-auth routes', () => {
    const guard = new MultiAuthGuard(reflector)

    expect(
      guard.handleRequest(
        null,
        false,
        [new Error('No auth token'), new Error('No API key')],
        createContext(),
      ),
    ).toBe(false)
  })

  it('rejects invalid credentials on optional-auth routes', () => {
    const guard = new MultiAuthGuard(reflector)

    expect(() =>
      guard.handleRequest(
        null,
        false,
        [new Error('jwt expired'), new Error('No API key')],
        createContext({ authorization: 'Bearer expired-token' }),
      ),
    ).toThrow(UnauthorizedException)
  })

  it('returns an authenticated user on optional-auth routes', () => {
    const guard = new MultiAuthGuard(reflector)
    const user = { id: 'user-id' }

    expect(
      guard.handleRequest(
        null,
        user,
        [],
        createContext({ authorization: 'Bearer access-token' }),
      ),
    ).toBe(user)
  })
})

describe('API key precedence', () => {
  it('rejects an invalid key even when the session strategy would succeed', async () => {
    passport.use('api-key', {
      authenticate() {
        this.fail()
      },
    } as any)
    passport.use('jwt-access-token', {
      authenticate() {
        this.success({ id: 'session-user' })
      },
    } as any)
    const request = {
      headers: { 'x-api-key': 'invalid' },
      cookies: { token: 'valid-session' },
    }
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
    } as ExecutionContext
    const guard = new MultiAuthGuard({ getAllAndOverride: () => false } as any)
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    )
  })
})
