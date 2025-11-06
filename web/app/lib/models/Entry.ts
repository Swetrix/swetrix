export interface Entry {
  name: string | null
  count: number
  cc?: string
  rgc?: string
}

export interface CountryEntry extends Entry {
  cc: string
  rgc?: string
}
