export interface Organisation {
  id: string
  name: string
  created: string
  updated: string
}

export interface DetailedOrganisation extends Organisation {
  members: {
    id: string
    role: 'admin' | 'viewer'
    created: string
    confirmed: boolean
    user: {
      email: string
    }
  }[]
}
