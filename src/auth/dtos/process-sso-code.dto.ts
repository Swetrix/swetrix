import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class ProcessSSOCodeDto {
  @ApiProperty({
    description: 'Google auth token',
    example: '4/0AVHE...',
  })
  @IsString()
  token: string

  @ApiProperty({
    description: 'SSO session identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  hash: string
}
