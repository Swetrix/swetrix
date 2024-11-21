import { ApiProperty, PickType } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'
import { GetDataDto } from './getData.dto'

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
  event: string
}
