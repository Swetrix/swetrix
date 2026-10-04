export interface ApiKey {
  id: string
  name: string
  owner?: string
  projectReadOnly?: boolean
  keyPreview: string
  scopes: string[]
  projectIds: string[]
  allProjects: boolean
  unrestricted: boolean
  created: string | null
  rotated: string | null
}

export interface ApiKeyList {
  keys: ApiKey[]
  projects: { id: string; name: string }[]
  scopes: Record<string, string[]>
}

export interface ApiKeyInput {
  name: string
  scopes: string[]
  allProjects: boolean
  projectIds: string[]
}
