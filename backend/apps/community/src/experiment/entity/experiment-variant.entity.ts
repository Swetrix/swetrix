export interface ExperimentVariant {
  id: string
  experimentId: string
  name: string
  key: string
  description: string | null
  rolloutPercentage: number
  isControl: boolean
}

export interface ClickhouseExperimentVariant {
  id: string
  experimentId: string
  name: string
  key: string
  description: string | null
  rolloutPercentage: number
  isControl: number
}
