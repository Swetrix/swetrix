import { PickType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { GetDataDto } from './getData.dto'

export class GetSessionsDto extends PickType(GetDataDto, [
  'pid',
  'period',
  'from',
  'to',
  'filters',
  'timezone',
] as const) {
  @Type(() => Number)
  take: number

  @Type(() => Number)
  skip: number
}
