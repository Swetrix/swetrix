import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsString } from 'class-validator'

import { SSOProviders } from './sso-generate.dto'

export class SSOGetJWTByHashDto {
  @ApiProperty({
    description: 'SSO session identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  hash: string

  @ApiProperty({
    description: 'SSO provider name',
    enum: SSOProviders,
  })
  @IsEnum(SSOProviders)
  provider: SSOProviders

  @ApiProperty({
    description: 'Affiliate code',
    example: 'ABCDEFGH',
  })
  refCode?: string
}
