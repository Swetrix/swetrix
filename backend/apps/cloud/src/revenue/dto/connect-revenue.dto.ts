import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsIn,
  ValidateIf,
} from 'class-validator'

type RevenueProviderDto = 'stripe' | 'paddle' | 'api'

export class ConnectRevenueDto {
  @ApiProperty({
    description: 'Revenue provider to connect',
    enum: ['stripe', 'paddle', 'api'],
    example: 'stripe',
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['stripe', 'paddle', 'api'])
  provider: RevenueProviderDto

  @ApiProperty({
    description:
      'API key for the selected provider. Required for stripe (rk_live_*) and paddle (pdl_live_*). Not required for the "api" provider, which ingests revenue via POST /log/revenue.',
    examples: {
      stripe: { value: 'rk_live_xxxxxxxxxxxxxxxx' },
      paddle: { value: 'pdl_live_xxxxxxxxxxxxxxxx' },
    } as any,
    required: false,
  })
  @ValidateIf((o: ConnectRevenueDto) => o.provider !== 'api')
  @IsNotEmpty()
  @IsString()
  apiKey?: string

  @ApiProperty({
    description: 'Currency code for revenue reporting (ISO 4217)',
    example: 'USD',
    default: 'USD',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string
}
