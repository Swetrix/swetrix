export interface IEntry {
  name: string
  count: number
  cc?: string
}

export interface ICountryEntry extends IEntry {
  cc: string
}
