import { ApiProperty } from '@nestjs/swagger'
import { IsNumber } from 'class-validator'

export class IChangePlanDTO {
  @ApiProperty({ example: 12345, required: true })
  @IsNumber()
  planId: number
}
