import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean } from 'class-validator'

export class SetShowLiveVisitorsDTO {
  @ApiProperty({ required: true })
  @IsBoolean()
  show: boolean
}
