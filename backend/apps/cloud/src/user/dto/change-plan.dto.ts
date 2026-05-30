import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator'

const PLAN_TYPES = ['standard', 'plus', 'enterprise'] as const

export class IChangePlanDTO {
  @ApiProperty({ example: 12345, required: true })
  @IsNumber()
  planId: number

  @ApiProperty({ example: 'standard', required: false })
  @IsOptional()
  @IsIn(PLAN_TYPES)
  planType?: string

  @ApiProperty({ example: '100k', required: false })
  @IsOptional()
  @IsString()
  eventTier?: string
}
