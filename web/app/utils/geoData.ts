import type { GeoJsonObject } from 'geojson'

let countriesGeoData: GeoJsonObject | null = null

let regionsGeoData: GeoJsonObject | null = null

const GEO_DATA_RETRY_DELAYS_MS = [250, 750]

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const fetchGeoData = async (url: string): Promise<GeoJsonObject> => {
  let lastError: unknown

  for (
    let attempt = 0;
    attempt <= GEO_DATA_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    try {
      const response = await fetch(url, {
        cache: attempt === 0 ? 'force-cache' : 'reload',
      })

      if (!response.ok) {
        throw new Error(
          `Failed to load "${url}": ${response.status} ${response.statusText}`,
        )
      }

      return (await response.json()) as GeoJsonObject
    } catch (reason) {
      lastError = reason

      if (attempt === GEO_DATA_RETRY_DELAYS_MS.length) {
        break
      }

      await sleep(GEO_DATA_RETRY_DELAYS_MS[attempt])
    }
  }

  throw lastError
}

export const loadCountriesGeoData = async (): Promise<GeoJsonObject> => {
  if (countriesGeoData) {
    return countriesGeoData
  }

  try {
    countriesGeoData = await fetchGeoData('/geo/countries_50m.geojson')
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
    regionsGeoData = await fetchGeoData('/geo/regions.geojson')
    return regionsGeoData as GeoJsonObject
  } catch (reason) {
    console.error('Failed to load regions geo data:', reason)
    throw reason
  }
}
