import { ApiProperty } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

export class AuthUserGoogleDto {
  @ApiProperty({
    description: 'SSO session identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  hash: string
}
