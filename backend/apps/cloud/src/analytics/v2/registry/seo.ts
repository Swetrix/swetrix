import { UnprocessableEntityException } from '@nestjs/common'

import { V2Filter } from '../query/filters.translator'

/**
 * SEO data is served by the Google Search Console API rather than ClickHouse,
 * so it cannot join the column/sqlExpr registry in ./dimensions and ./metrics.
 * These definitions mirror that registry's shape and lookup semantics to keep
 * /v2/projects/:pid/seo/* consistent with the rest of the v2 surface.
 */

export type V2SeoGscDimension = 'query' | 'page' | 'country' | 'device'

export interface V2SeoDimensionDef {
  api: string
  gsc: V2SeoGscDimension
  description: string
}

export interface V2SeoMetricDef {
  api: string
  isDefault?: boolean
  format: 'integer' | 'percent' | 'position'
  description: string
}

export const V2_SEO_DIMENSIONS: V2SeoDimensionDef[] = [
  {
    api: 'query',
    gsc: 'query',
    description: 'Search query the site was surfaced for',
  },
  {
    api: 'page',
    gsc: 'page',
    description: 'Landing page URL that appeared in search results',
  },
  {
    api: 'country',
    gsc: 'country',
    description: 'Country the search was made from (ISO 3166-1 alpha-2 code)',
  },
  {
    api: 'device',
    gsc: 'device',
    description: 'Device category the search was made on',
  },
]

const V2_SEO_METRICS: V2SeoMetricDef[] = [
  {
    api: 'clicks',
    isDefault: true,
    format: 'integer',
    description: 'Clicks through to the site from search results',
  },
  {
    api: 'impressions',
    isDefault: true,
    format: 'integer',
    description: 'Times a link to the site appeared in search results',
  },
  {
    api: 'ctr',
    isDefault: true,
    format: 'percent',
    description: 'Click-through rate, as a percentage of impressions',
  },
  {
    api: 'position',
    isDefault: true,
    format: 'position',
    description: 'Average position in search results',
  },
]

export const listSeoDimensions = (): V2SeoDimensionDef[] => V2_SEO_DIMENSIONS

export const listSeoMetrics = (): V2SeoMetricDef[] => V2_SEO_METRICS

const findSeoDimension = (api: string): V2SeoDimensionDef | undefined =>
  V2_SEO_DIMENSIONS.find((dimension) => dimension.api === api)

export const getSeoBreakdownDimension = (api: string): V2SeoDimensionDef => {
  const dimension = findSeoDimension(api)

  if (!dimension) {
    throw new UnprocessableEntityException(
      `Unknown seo dimension '${api}'. Supported dimensions: ${V2_SEO_DIMENSIONS.map(
        (d) => d.api,
      ).join(', ')}`,
    )
  }

  return dimension
}

export const getSeoMetric = (api: string): V2SeoMetricDef => {
  const metric = V2_SEO_METRICS.find((m) => m.api === api)

  if (!metric) {
    throw new UnprocessableEntityException(
      `Unknown seo metric '${api}'. Supported metrics: ${V2_SEO_METRICS.map(
        (m) => m.api,
      ).join(', ')}`,
    )
  }

  return metric
}

export const getDefaultSeoMetrics = (): V2SeoMetricDef[] =>
  V2_SEO_METRICS.filter((metric) => metric.isDefault)

export const parseSeoMetricsParam = (
  metrics: string | undefined,
): V2SeoMetricDef[] => {
  if (!metrics) {
    return getDefaultSeoMetrics()
  }

  const names = [
    ...new Set(
      metrics
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ]

  if (names.length === 0) {
    return getDefaultSeoMetrics()
  }

  return names.map((name) => getSeoMetric(name))
}

/**
 * Search Console orders rows by clicks descending and exposes no sort control,
 * so this is the only ordering the seo breakdown can honour. It is accepted
 * (rather than rejected outright) so callers can be explicit about it.
 */
export const SEO_SORT = 'clicks:desc'

/**
 * GSCService.parseFilters keys filters by their v1 URL names, where the keyword
 * dimension is 'keywords'. v2 calls it 'query', after Search Console's own
 * naming, so translate on the way down — the same v2 -> v1 hop the ClickHouse
 * data types make through toV1FiltersJson.
 */
export const toGscFiltersJson = (filters: V2Filter[]): string | undefined => {
  if (filters.length === 0) {
    return undefined
  }

  return JSON.stringify(
    filters.map((filter) => ({
      ...filter,
      dimension: filter.dimension === 'query' ? 'keywords' : filter.dimension,
    })),
  )
}

/**
 * Search Console expresses filters as dimensionFilterGroups of scalar
 * comparisons, so the array / null values the rest of v2 accepts have no
 * equivalent here. Reject them rather than silently dropping the filter.
 */
export const validateSeoFilters = (filters: V2Filter[]): V2Filter[] => {
  for (const filter of filters) {
    if (!findSeoDimension(filter.dimension)) {
      throw new UnprocessableEntityException(
        `Unknown seo filter dimension '${filter.dimension}'. Supported dimensions: ${V2_SEO_DIMENSIONS.map(
          (d) => d.api,
        ).join(', ')}`,
      )
    }

    if (Array.isArray(filter.value)) {
      throw new UnprocessableEntityException(
        `The seo filter on '${filter.dimension}' cannot take an array of values; Search Console only supports a single value per filter`,
      )
    }

    if (filter.value === null) {
      throw new UnprocessableEntityException(
        `The seo filter on '${filter.dimension}' cannot take a null value; Search Console does not report unset dimension values`,
      )
    }
  }

  return filters
}
