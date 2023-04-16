import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'

import { SSOProviders } from './sso-generate.dto'

export class SSOUnlinkDto {
  @ApiProperty({
    description: 'SSO provider name',
    enum: SSOProviders,
  })
  @IsEnum(SSOProviders)
  provider: SSOProviders
}
