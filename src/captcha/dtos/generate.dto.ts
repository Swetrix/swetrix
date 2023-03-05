import { ApiProperty } from '@nestjs/swagger'

export const DEFAULT_THEME = 'light'

export class GenerateDTO {
  @ApiProperty({
    default: DEFAULT_THEME,
    required: false,
    description: 'Captcha theme',
  })
  theme?: string
}
