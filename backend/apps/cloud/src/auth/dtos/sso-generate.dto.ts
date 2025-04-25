import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'

export enum SSOProviders {
  GOOGLE = 'google',
  GITHUB = 'github',
}

export class SSOGenerateDto {
  @ApiProperty({
    description:
      'Redirect URL after successful authentication; unused. Only set for compatibility with the Community Edition.',
    required: false,
  })
  @IsOptional()
  redirectUrl: string

  @ApiProperty({
    description: 'SSO provider name',
    enum: SSOProviders,
  })
  @IsEnum(SSOProviders)
  provider: SSOProviders
}
