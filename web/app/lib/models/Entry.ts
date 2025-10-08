export interface Entry {
  name: string
  count: number
  cc?: string
  rgc?: string
}

export interface CountryEntry extends Entry {
  cc: string
  rgc?: string
}
