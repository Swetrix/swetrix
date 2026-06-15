import { ApiProperty } from '@nestjs/swagger'
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'

const PLAN_TYPES = ['standard', 'plus', 'enterprise'] as const
const EVENT_TIERS = [
  '100k',
  '200k',
  '500k',
  '1m',
  '2m',
  '5m',
  '10m',
  '15m',
  '20m',
  '30m',
  '40m',
  '50m',
] as const

export class IChangePlanDTO {
  @ApiProperty({ example: 12345, required: true })
  @IsNumber()
  planId: number

  @ApiProperty({ example: 'standard', required: false })
  @IsOptional()
  @IsIn(PLAN_TYPES)
  planType?: string

  @ApiProperty({ example: '100k', required: false, enum: EVENT_TIERS })
  @IsOptional()
  @IsIn(EVENT_TIERS)
  eventTier?: string

  @ApiProperty({ example: 'usr_12345', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  swetrixProfileId?: string

  @ApiProperty({ example: '123456789', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  swetrixSessionId?: string
}
