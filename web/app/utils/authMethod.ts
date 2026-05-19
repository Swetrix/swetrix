export const LAST_AUTH_METHOD_COOKIE = 'swx_last_auth_method'
export const LAST_AUTH_METHOD_MAX_AGE = 31536000

export const LAST_AUTH_METHODS = [
  'email',
  'google',
  'github',
  'openid-connect',
] as const

export type LastAuthMethod = (typeof LAST_AUTH_METHODS)[number]

export const isLastAuthMethod = (
  method: string | null | undefined,
): method is LastAuthMethod =>
  LAST_AUTH_METHODS.some((authMethod) => authMethod === method)
