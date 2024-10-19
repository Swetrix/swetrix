import { PickType } from '@nestjs/swagger'
import { GetDataDto } from './getData.dto'

export class GetSessionsDto extends PickType(GetDataDto, [
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
