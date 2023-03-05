import { ApiProperty } from '@nestjs/swagger'
import { IsOptional } from 'class-validator'

export const DEFAULT_THEME = 'light'

export class GenerateDTO {
  @ApiProperty({
    default: DEFAULT_THEME,
    required: false,
    description: 'Captcha theme',
  })
  @IsOptional()
  theme?: string
}
