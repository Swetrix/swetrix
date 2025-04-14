export interface Metainfo {
  country: string | null
  region: string | null
  city: string | null
  symbol: string
  code: 'USD' | 'EUR' | 'GBP'
}

export const DEFAULT_METAINFO: Metainfo = {
  country: null,
  region: null,
  city: null,
  symbol: '$',
  code: 'USD',
}
