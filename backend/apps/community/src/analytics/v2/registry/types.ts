import { PerfMeasure } from '../../interfaces'

export type V2DataType = 'traffic' | 'performance' | 'captcha' | 'errors'

interface V2DimensionExtraField {
  /** Public API name of the sibling field, e.g. 'country' */
  api: string
  /** ClickHouse column of the sibling field, e.g. 'cc' */
  column: string
}

export interface V2DimensionDef {
  /** Public API name, snake_case: 'country', 'browser_version' */
  api: string
  /**
   * v1 filter column / ClickHouse column: 'cc', 'brv'. For captcha meta
   * dimensions this is the v1 virtual column name ('captcha_event',
   * 'solve_time') which getFiltersQuery resolves to a SQL expression.
   * For errors-only filter dimensions this is the v1 public name ('name',
   * 'message', 'filename') which getFiltersQuery maps to error_* columns.
   */
  column: string
  /** Data types this dimension is valid for */
  types: V2DataType[]
  /** Sibling columns returned with each row, e.g. region -> country + region_code */
  extraFields?: V2DimensionExtraField[]
  /** Mirrors v1 EXCLUDE_NULL_FOR behavior */
  excludeNull?: boolean
  /** Usable in ?filters but not as ?dimension= */
  filterOnly?: boolean
  /** Needs a dedicated query path instead of the generic breakdown builder */
  virtual?: 'entry_page' | 'exit_page'
  /**
   * Extra WHERE fragment (starting with 'AND ...') appended to the breakdown
   * query. Used by captcha dimensions to scope rows to the relevant
   * captcha lifecycle event, mirroring v1 generateParamsQuery.
   */
  extraWhere?: string
  description: string
}

export interface V2MetricCtx {
  customEVFilterApplied: boolean
  measure?: PerfMeasure
}

export interface V2MetricDef {
  /** Public API name, snake_case: 'visitors', 'bounce_rate' */
  api: string
  /** Data types this metric is valid for */
  types: V2DataType[]
  /**
   * ClickHouse aggregate expression, or null when the metric cannot be
   * computed by the generic breakdown builder (e.g. it needs the sessions
   * join, or it only exists on timeseries/summary queries).
   */
  sqlExpr: (ctx: V2MetricCtx) => string | null
  /** Metric needs the sessions-table join — timeseries/summary only */
  requiresSessionsJoin?: boolean
  /** Included when no ?metrics= is provided */
  isDefault?: boolean
  format?: 'integer' | 'seconds' | 'percent'
  description: string
}
