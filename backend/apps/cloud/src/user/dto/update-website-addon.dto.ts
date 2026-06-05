import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsInt, Max, Min } from 'class-validator'

import { BillingFrequency } from '../entities/user.entity'

export class UpdateWebsiteAddonDTO {
  @ApiProperty({ example: 100, minimum: 0, maximum: 1000 })
  @IsInt()
  @Min(0)
  @Max(1000)
  quantity: number

  @ApiProperty({ example: BillingFrequency.Monthly, enum: BillingFrequency })
  @IsIn([BillingFrequency.Monthly, BillingFrequency.Yearly])
  billingInterval: BillingFrequency
}

export class UpdateSessionReplayAddonDTO {
  @ApiProperty({ example: 5000, minimum: 0, maximum: 100000 })
  @IsInt()
  @Min(0)
  @Max(100000)
  quantity: number

  @ApiProperty({ example: BillingFrequency.Monthly, enum: BillingFrequency })
  @IsIn([BillingFrequency.Monthly, BillingFrequency.Yearly])
  billingInterval: BillingFrequency
}
