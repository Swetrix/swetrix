import { ApiProperty } from '@nestjs/swagger'
import { TimeFormat } from '../entities/user.entity'

export class UpdateUserProfileDTO {
  @ApiProperty({ example: 'Europe/Kiev' })
  timezone: string

  @ApiProperty({ example: '24-hour', enum: TimeFormat })
  timeFormat: string
}
