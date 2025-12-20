import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches } from 'class-validator'

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
  @Matches(/^(google|github):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'Invalid SSO session identifier.',
  })
  hash: string
}
