import { PickType } from '@nestjs/swagger'
import { AnalyticsGET_DTO } from './getData.dto'

export class GetCustomEventMetadata extends PickType(AnalyticsGET_DTO, [
  'pid',
  'period',
  'timeBucket',
  'from',
  'to',
  'filters',
  'timezone',
  'filters',
] as const) {
  event: string
}
