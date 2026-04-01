import { IsString, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

import { SUPPORTED_PROVIDERS } from '../mappers'

export class UploadImportDto {
  @ApiProperty({
    description: 'Analytics provider to import from',
    enum: SUPPORTED_PROVIDERS,
    example: 'umami',
  })
  @IsString()
  @IsIn(SUPPORTED_PROVIDERS)
  provider: (typeof SUPPORTED_PROVIDERS)[number]
}
