import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Length } from 'class-validator'

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
