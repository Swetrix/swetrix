import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

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
}
