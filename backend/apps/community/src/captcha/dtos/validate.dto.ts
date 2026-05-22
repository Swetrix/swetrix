import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class ValidateDto {
  @ApiProperty({
    required: true,
    description: 'Captcha pass token',
  })
  @IsNotEmpty()
  @IsString()
  token: string

  @ApiProperty({
    required: true,
    description: 'Secret API key',
  })
  @IsNotEmpty()
  @IsString()
  secret: string
}
