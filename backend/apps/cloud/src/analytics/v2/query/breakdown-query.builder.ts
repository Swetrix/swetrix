import { UnprocessableEntityException } from '@nestjs/common'

import { getCaptchaColumnExpression } from '../../analytics.service'
import {
  captchaExtraWhere,
  V2DataType,
  V2DimensionDef,
  V2MetricCtx,
  V2MetricDef,
} from '../registry'

export interface BreakdownSort {
  field: string
  direction: 'asc' | 'desc'
}

export interface BreakdownQueryOptions {
  dataType: V2DataType
  dimension: V2DimensionDef
  metrics: V2MetricDef[]
  /** 'FROM events WHERE ...' fragment, incl. filters and time range params */
  subQuery: string
  ctx: V2MetricCtx
  sort: BreakdownSort
}

export const parseSortParam = (
  sort: string | undefined,
  dimension: V2DimensionDef,
  metrics: V2MetricDef[],
): BreakdownSort => {
  if (!sort) {
    return { field: metrics[0].api, direction: 'desc' }
  }

  const [field, direction = 'desc'] = sort.split(':')

  if (direction !== 'asc' && direction !== 'desc') {
    throw new UnprocessableEntityException(
      `Invalid sort direction '${direction}'; use 'asc' or 'desc'`,
    )
  }

  const sortable = ['value', ...metrics.map((metric) => metric.api)]

  if (!sortable.includes(field)) {
    throw new UnprocessableEntityException(
      `Cannot sort '${dimension.api}' breakdown by '${field}'. Sortable fields: ${sortable.join(', ')}`,
    )
  }

  return { field, direction }
}

/**
 * Multi-metric generalization of v1's generateParamsQuery: one dimension,
 * N metric aggregates, ORDER BY + LIMIT/OFFSET pagination and a windowed
 * total. Expects `v2_limit` and `v2_offset` in the query params.
 */
export const buildBreakdownQuery = (opts: BreakdownQueryOptions): string => {
  const { dataType, dimension, metrics, subQuery, ctx, sort } = opts

  const dimensionSql =
    dataType === 'captcha'
      ? getCaptchaColumnExpression(dimension.column)
      : dimension.column

  const dimensionCols = [
    `${dimensionSql} AS value`,
    ...(dimension.extraFields ?? []).map(
      (field) => `${field.column} AS ${field.api}`,
    ),
  ]

  const metricCols = metrics.map((metric) => {
    const expr = metric.sqlExpr(ctx)

    if (!expr) {
      throw new UnprocessableEntityException(
        `The '${metric.api}' metric is not supported on breakdowns. Request it on the timeseries or summary endpoint instead`,
      )
    }

    return `${expr} AS ${metric.api}`
  })

  const groupBy = ['value', ...(dimension.extraFields ?? []).map((f) => f.api)]

  const whereParts: string[] = []

  if (dimension.excludeNull) {
    whereParts.push(`AND ${dimension.column} IS NOT NULL`)
  }

  if (dataType === 'captcha') {
    const guard = captchaExtraWhere(dimension)
    if (guard) {
      whereParts.push(guard)
    }
  }

  return `
    SELECT
      ${[...dimensionCols, ...metricCols].join(',\n      ')},
      count() OVER () AS __total
    ${subQuery}
    ${whereParts.join(' ')}
    GROUP BY ${groupBy.join(', ')}
    ORDER BY ${sort.field} ${sort.direction}
    LIMIT {v2_limit:UInt32} OFFSET {v2_offset:UInt32}
  `
}
