interface UserFlowData {
  nodes: {
    id: string
  }[]
  links: {
    source: string
    target: string
    value: number
  }[]
}

export type UserFlowType = UserFlowData | null

export interface UserFlowResult {
  ascending: UserFlowData
  descending: UserFlowData
}
