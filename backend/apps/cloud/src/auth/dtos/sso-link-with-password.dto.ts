import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsString, IsOptional, Length } from 'class-validator'

import { SSOProviders } from './sso-generate.dto'

export class SSOLinkWithPasswordDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsString()
  email: string

  @ApiProperty({
    description: 'User password',
    example: 'password123',
  })
  @IsString()
  password: string

  @ApiPropertyOptional({
    description:
      'Two-factor authentication code (required if 2FA is enabled on the account)',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  @Length(6, 20)
  twoFactorAuthenticationCode?: string

  @ApiProperty({
    description: 'SSO provider name',
    enum: SSOProviders,
  })
  @IsEnum(SSOProviders)
  provider: SSOProviders

  @ApiProperty({
    description: 'SSO ID from the provider (Google sub or GitHub id)',
    example: '123456789',
  })
  @IsString()
  ssoId: string
}
