export interface Organisation {
  id: string
  name: string
  created: string
  updated: string
}

export type Role = 'owner' | 'admin' | 'viewer'

export interface DetailedOrganisation extends Organisation {
  members: {
    id: string
    role: Role
    created: string
    confirmed: boolean
    user: {
      email: string
    }
  }[]
  projects: {
    id: string
    name: string
    admin: {
      email: string
    }
  }[]
}

export interface OrganisationMembership {
  id: string
  role: Role
  confirmed: boolean
  created: string
  organisation: Organisation
}
