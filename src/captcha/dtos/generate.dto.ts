import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsNotEmpty, Matches } from 'class-validator'

import { PID_REGEX } from '../../common/constants'

export const DEFAULT_THEME = 'light'

export class GenerateDTO {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'A unique project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX)
  pid: string

  @ApiProperty({
    default: DEFAULT_THEME,
    required: false,
    description: 'Captcha theme',
  })
  @IsOptional()
  theme?: string
}
