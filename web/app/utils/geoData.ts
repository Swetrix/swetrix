import type { GeoJsonObject } from 'geojson'

let countriesGeoData: GeoJsonObject | null = null

let regionsGeoData: GeoJsonObject | null = null

export const loadCountriesGeoData = async (): Promise<GeoJsonObject> => {
  if (countriesGeoData) {
    return countriesGeoData
  }

  try {
    const response = await fetch('/geo/countries_50m.geojson')
    countriesGeoData = await response.json()
    return countriesGeoData as GeoJsonObject
  } catch (reason) {
    console.error('Failed to load countries geo data:', reason)
    throw reason
  }
}

export const loadRegionsGeoData = async (): Promise<GeoJsonObject> => {
  if (regionsGeoData) {
    return regionsGeoData
  }

  try {
    const response = await fetch('/geo/regions.geojson')
    regionsGeoData = await response.json()
    return regionsGeoData as GeoJsonObject
  } catch (reason) {
    console.error('Failed to load regions geo data:', reason)
    throw reason
  }
}
