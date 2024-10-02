import { PickType } from '@nestjs/swagger'
import { AnalyticsGET_DTO } from './getData.dto'

export class GetCustomEventsDto extends PickType(AnalyticsGET_DTO, [
  'pid',
  'period',
  'timeBucket',
  'from',
  'to',
  'filters',
  'timezone',
] as const) {
  customEvents: string
}
