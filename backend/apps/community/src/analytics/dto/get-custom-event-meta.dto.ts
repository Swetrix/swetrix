import { ApiProperty, PickType } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'
import { GetDataDto } from './getData.dto'

const MAX_CUSTOM_EVENT_NAME_LENGTH = 256

export class GetCustomEventMetadata extends PickType(GetDataDto, [
  'pid',
  'period',
  'timeBucket',
  'from',
  'to',
  'filters',
  'timezone',
  'filters',
] as const) {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(MAX_CUSTOM_EVENT_NAME_LENGTH)
  event: string
}
