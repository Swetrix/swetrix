import { PickType } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'
import { GetDataDto } from './getData.dto'

const MAX_CUSTOM_EVENTS_QUERY_LENGTH = 10000

export class GetCustomEventsDto extends PickType(GetDataDto, [
  'pid',
  'period',
  'timeBucket',
  'from',
  'to',
  'filters',
  'timezone',
] as const) {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_CUSTOM_EVENTS_QUERY_LENGTH)
  customEvents: string
}
