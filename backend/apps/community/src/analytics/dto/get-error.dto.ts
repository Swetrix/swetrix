import { ApiProperty, PickType } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'
import { GetDataDto } from './getData.dto'

export class GetErrorDto extends PickType(GetDataDto, [
  'pid',
  'period',
  'timeBucket',
  'from',
  'to',
  'timezone',
] as const) {
  @ApiProperty()
  @IsNotEmpty()
  eid: string
}
