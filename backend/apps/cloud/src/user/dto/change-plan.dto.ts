import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty } from 'class-validator'

export class IChangePlanDTO {
  @ApiProperty({ example: 'pri_100k_monthly', required: true })
  @IsString()
  @IsNotEmpty()
  priceId: string
}
