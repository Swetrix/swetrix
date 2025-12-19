import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString, Length, IsIn } from 'class-validator'

export type RevenueProviderDto = 'stripe' | 'paddle'

export class ConnectRevenueDto {
  @ApiProperty({
    description: 'Revenue provider to connect',
    enum: ['stripe', 'paddle'],
    example: 'stripe',
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['stripe', 'paddle'])
  provider: RevenueProviderDto

  @ApiProperty({
    description:
      'API key for the selected provider. Stripe: rk_live_*. Paddle: pdl_live_*.',
    examples: {
      stripe: { value: 'rk_live_xxxxxxxxxxxxxxxx' },
      paddle: { value: 'pdl_live_xxxxxxxxxxxxxxxx' },
    } as any,
  })
  @IsNotEmpty()
  @IsString()
  apiKey: string

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
