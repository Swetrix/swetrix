import { ApiProperty, PickType } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'
import { AnalyticsGET_DTO } from './getData.dto'

export class GetErrorDTO extends PickType(AnalyticsGET_DTO, [
  'pid',
  'period',
  'from',
  'to',
  'timezone',
] as const) {
  @ApiProperty()
  @IsNotEmpty()
  eid: string
}
