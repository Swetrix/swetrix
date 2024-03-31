import { PickType } from '@nestjs/swagger'
import { AnalyticsGET_DTO } from './getData.dto'

export class GetErrorsDto extends PickType(AnalyticsGET_DTO, [
  'pid',
  'period',
  'from',
  'to',
  'filters',
  'timezone',
] as const) {
  take: number

  skip: number
}
