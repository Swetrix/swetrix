export const API_KEY_SCOPES = {
  analytics: ['read'],
  events: ['read', 'write'],
  projects: ['read', 'write'],
  funnels: ['read', 'write'],
  annotations: ['read', 'write'],
  errors: ['read', 'write'],
  replays: ['read', 'write'],
  goals: ['read'],
  flags: ['read'],
} as const

export type ApiKeyScope = `${keyof typeof API_KEY_SCOPES}:${'read' | 'write'}`
export interface ApiKeyRecord {
  id: string
  userId: string
  name: string
  keyHash: string
  encryptedKey: string
  keyPreview: string
  scopes: ApiKeyScope[]
  projectIds: string[]
  allProjects: boolean
  unrestricted: boolean
  created: string | null
  rotated: string | null
}
export type ApiKeyPrincipal = Pick<
  ApiKeyRecord,
  'id' | 'scopes' | 'projectIds' | 'allProjects' | 'unrestricted'
>
export const API_KEY_ACCESS = 'apiKeyAccess'
export interface ApiKeyPolicy {
  scope: ApiKeyScope
  requires?: ApiKeyScope[]
  source:
    | 'params'
    | 'query'
    | 'body'
    | 'list'
    | 'account'
    | 'create'
    | 'goal'
    | 'flag'
    | 'export'
  field?: string
}
