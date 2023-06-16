interface UserFlow {
  nodes: {
    id: string
  }[]
  links: {
    source: string
    target: string
    value: number
  }[]
}

export type IUserFlow = UserFlow | null
