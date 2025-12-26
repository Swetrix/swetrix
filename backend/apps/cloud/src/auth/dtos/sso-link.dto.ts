import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsString, Matches } from 'class-validator'

import { SSOProviders } from './sso-generate.dto'

export class SSOLinkDto {
  @ApiProperty({
    description: 'SSO session identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @Matches(
    /^(google|github):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    {
      message: 'Invalid SSO session identifier.',
    },
  )
  hash: string

  @ApiProperty({
    description: 'SSO provider name',
    enum: SSOProviders,
  })
  @IsEnum(SSOProviders)
  provider: SSOProviders
}
