import { PickType } from '@nestjs/swagger'
import { AnalyticsGET_DTO } from './getData.dto'

export class GetPagePropertyMeta extends PickType(AnalyticsGET_DTO, [
  'pid',
  'period',
  'timeBucket',
  'from',
  'to',
  'filters',
  'timezone',
  'filters',
] as const) {
  property: string
}
