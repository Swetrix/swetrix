import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, Matches } from 'class-validator'

import { PID_REGEX } from '../../common/constants'

export class AutomaticDTO {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'A unique project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX)
  pid: string
}
