import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'

export enum SSOProviders {
  GOOGLE = 'google',
  GITHUB = 'github',
}

export class SSOGenerateDto {
  @ApiProperty({
    description: 'SSO provider name',
    enum: SSOProviders,
  })
  @IsEnum(SSOProviders)
  provider: string
}
