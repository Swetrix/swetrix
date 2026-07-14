import { PerfMeasure } from '../../interfaces'

export type V2DataType = 'traffic' | 'performance' | 'captcha' | 'errors'

interface V2DimensionExtraField {
  api: string
  column: string
}

export interface V2DimensionDef {
  api: string
  column: string
  types: V2DataType[]
  extraFields?: V2DimensionExtraField[]
  excludeNull?: boolean
  filterOnly?: boolean
  virtual?: 'entry_page' | 'exit_page'
  extraWhere?: string
  description: string
}

export interface V2MetricCtx {
  customEVFilterApplied: boolean
  measure?: PerfMeasure
}

export interface V2MetricDef {
  api: string
  types: V2DataType[]
  sqlExpr: (ctx: V2MetricCtx) => string | null
  requiresSessionsJoin?: boolean
  isDefault?: boolean
  format?: 'integer' | 'seconds' | 'percent'
  description: string
}
