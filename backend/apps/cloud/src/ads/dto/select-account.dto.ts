import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class SelectAdsAccountDto {
  @ApiProperty({ description: 'Google Ads customer id (digits only)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{1,20}$/)
  customerId: string
}
