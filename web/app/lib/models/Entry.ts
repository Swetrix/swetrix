export interface Entry {
  name: string
  count: number
  cc?: string
}

export interface CountryEntry extends Entry {
  cc: string
}
