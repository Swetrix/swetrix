import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  MaxLength,
  Validate,
} from 'class-validator'

import { PID_REGEX } from '../../common/constants'
import {
  MetadataKeysQuantity,
  MetadataSizeLimit,
  MetadataValueType,
  MAX_METADATA_KEYS,
  MAX_METADATA_VALUE_LENGTH,
  transformMetadataJsonPrimitivesToString,
} from '../../analytics/dto/events.dto'

type LogRevenueType = 'sale' | 'refund' | 'subscription'

export class LogRevenueDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  @ApiPropertyOptional({
    example: 'order_42891',
    description:
      'Stable unique identifier for this transaction. Re-sending with the same transactionId is idempotent (replaces the previous version). If omitted, a UUID is generated.',
    maxLength: 256,
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  transactionId?: string

  @ApiProperty({
    enum: ['sale', 'refund', 'subscription'],
    example: 'sale',
    description:
      'Transaction type. Use "refund" to record a refund (amount will be stored as a negative value).',
  })
  @IsNotEmpty()
  @IsIn(['sale', 'refund', 'subscription'])
  type: LogRevenueType

  @ApiProperty({
    example: 49.99,
    description:
      'Transaction amount in major currency units (e.g. 49.99 for $49.99). Always send a positive number; for refunds the sign is applied automatically.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  amount: number

  @ApiProperty({
    example: 'USD',
    description: 'ISO 4217 currency code of the amount',
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  currency: string

  @ApiPropertyOptional({
    example: 'sku_pro_yearly',
    description: 'Optional product / SKU identifier',
    maxLength: 256,
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  productId?: string

  @ApiPropertyOptional({
    example: 'Pro plan (yearly)',
    description: 'Optional human-readable product name',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  productName?: string

  @ApiPropertyOptional({
    example: 'usr_12345',
    description:
      'Optional profile ID for revenue attribution. Same value as you would pass to the Swetrix tracking script.',
    maxLength: 256,
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  profileId?: string

  @ApiPropertyOptional({
    example: '8214637194021987452',
    description:
      'Optional session ID for attributing revenue to a specific browsing session.',
    maxLength: 256,
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  sessionId?: string

  @ApiPropertyOptional({
    example: '2026-04-27T16:32:01Z',
    description:
      'Transaction date as an ISO 8601 string. Defaults to the time the request is received.',
  })
  @IsOptional()
  @IsISO8601()
  created?: string

  @ApiPropertyOptional({
    example: { plan: 'pro', billing: 'annual' },
    description: 'Arbitrary metadata stored alongside the transaction',
  })
  @IsOptional()
  @IsObject()
  @Validate(MetadataKeysQuantity, {
    message: `Metadata object can't have more than ${MAX_METADATA_KEYS} keys`,
  })
  @Transform(({ value }) => transformMetadataJsonPrimitivesToString(value))
  @Validate(MetadataValueType, {
    message: 'All of metadata object values must be primitive JSON values',
  })
  @Validate(MetadataSizeLimit, {
    message: `Metadata object can't have keys and values with total length more than ${MAX_METADATA_VALUE_LENGTH} characters`,
  })
  metadata?: Record<string, string>
}
