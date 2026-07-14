import { UnprocessableEntityException } from '@nestjs/common'

import { DataType } from '../../analytics.service'
import { V2_DIMENSIONS } from './dimensions'
import { V2_METRICS } from './metrics'
import { V2DataType, V2DimensionDef, V2MetricDef } from './types'

export * from './types'
export {
  V2_DIMENSIONS,
  V2_KEYED_FILTER_DIMENSIONS,
  captchaExtraWhere,
} from './dimensions'

export const V2_TO_V1_DATATYPE: Record<V2DataType, DataType> = {
  traffic: DataType.ANALYTICS,
  performance: DataType.PERFORMANCE,
  captcha: DataType.CAPTCHA,
  errors: DataType.ERRORS,
}

export const listDimensions = (type: V2DataType): V2DimensionDef[] =>
  V2_DIMENSIONS.filter((dimension) => dimension.types.includes(type))

export const listMetrics = (type: V2DataType): V2MetricDef[] =>
  V2_METRICS.filter((metric) => metric.types.includes(type))

export const findDimension = (
  api: string,
  type: V2DataType,
): V2DimensionDef | undefined =>
  V2_DIMENSIONS.find(
    (dimension) => dimension.api === api && dimension.types.includes(type),
  )

export const getBreakdownDimension = (
  api: string,
  type: V2DataType,
): V2DimensionDef => {
  const dimension = findDimension(api, type)

  if (!dimension) {
    throw new UnprocessableEntityException(
      `Unknown ${type} dimension '${api}'. Supported dimensions: ${listDimensions(
        type,
      )
        .filter((d) => !d.filterOnly)
        .map((d) => d.api)
        .join(', ')}`,
    )
  }

  if (dimension.filterOnly) {
    throw new UnprocessableEntityException(
      `The '${api}' dimension can only be used in filters, not as a breakdown dimension`,
    )
  }

  return dimension
}

export const getMetric = (api: string, type: V2DataType): V2MetricDef => {
  const metric = V2_METRICS.find((m) => m.api === api && m.types.includes(type))

  if (!metric) {
    throw new UnprocessableEntityException(
      `Unknown ${type} metric '${api}'. Supported metrics: ${listMetrics(type)
        .map((m) => m.api)
        .join(', ')}`,
    )
  }

  return metric
}

export const getDefaultMetrics = (type: V2DataType): V2MetricDef[] =>
  listMetrics(type).filter((metric) => metric.isDefault)

export const parseMetricsParam = (
  metrics: string | undefined,
  type: V2DataType,
): V2MetricDef[] => {
  if (!metrics) {
    return getDefaultMetrics(type)
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
    return getDefaultMetrics(type)
  }

  return names.map((name) => getMetric(name, type))
}
