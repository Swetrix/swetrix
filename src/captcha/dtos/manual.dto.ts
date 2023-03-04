import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class ManualDTO {
  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  hash: string

  @ApiProperty({
    required: true,
    example: '4vic2',
    description: 'Captcha code',
  })
  @IsNotEmpty()
  code: string
}
