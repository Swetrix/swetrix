import { PickType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, Min } from 'class-validator'
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
  @IsInt()
  @Min(0)
  take: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip: number
}
