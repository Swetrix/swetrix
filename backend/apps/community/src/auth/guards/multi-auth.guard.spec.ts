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
