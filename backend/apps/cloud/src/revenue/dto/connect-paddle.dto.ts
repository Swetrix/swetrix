import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  Length,
  Matches,
} from 'class-validator'

export class ConnectPaddleDto {
  @ApiProperty({
    description: 'Paddle API key (pdl_live_*)',
    example: 'pdl_live_xxxxxxxxxxxxxxxx',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^pdl_live_/, {
    message: 'Invalid Paddle API key format. Key should start with pdl_live_',
  })
  apiKey: string

  @ApiProperty({
    description: 'Currency code for revenue reporting (ISO 4217)',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string
}

export class UpdateRevenueCurrencyDto {
  @ApiProperty({
    description: 'Currency code for revenue reporting (ISO 4217)',
    example: 'USD',
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 3)
  currency: string
}
