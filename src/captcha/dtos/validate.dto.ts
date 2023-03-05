import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional } from 'class-validator'

export class ValidateDTO {
  @ApiProperty({
    required: true,
    description: 'Catpcha pass token',
  })
  @IsNotEmpty()
  token: string

  @ApiProperty({
    required: true,
    description: 'Secret API key',
  })
  @IsNotEmpty()
  secret: string

  @ApiProperty({
    required: false,
    description: 'Captcha hash (if available)',
  })
  @IsOptional()
  hash?: string

  @ApiProperty({
    required: true,
    description: 'Captcha pass timestamp',
  })
  @IsNotEmpty()
  timestamp: number
}
