import { PickType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, Min, Max } from 'class-validator'
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
  @Max(150)
  take: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip: number

  @IsOptional()
  @IsIn(['traffic', 'performance', 'error'])
  sessionEvent?: 'traffic' | 'performance' | 'error'
}
