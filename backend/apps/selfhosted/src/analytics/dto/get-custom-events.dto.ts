import { PickType } from '@nestjs/swagger'
import { GetDataDto } from './getData.dto'

export class GetCustomEventsDto extends PickType(GetDataDto, [
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
