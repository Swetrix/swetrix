import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  IsObject,
  Validate,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { PID_REGEX } from '../../common/constants'
import {
  MAX_METADATA_KEYS,
  MAX_METADATA_VALUE_LENGTH,
  MetadataKeysQuantity,
  MetadataValueType,
  MetadataSizeLimit,
  transformMetadataJsonPrimitivesToString,
} from './events.dto'

export class ErrorDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, {
    message: 'The provided Project ID (pid) is incorrect',
  })
  pid: string

  // Tracking metrics
  @ApiProperty({
    example: 'Europe/Kiev',
    description: "User's timezone",
  })
  @IsOptional()
  @IsString()
  tz?: string

  @ApiProperty({
    example: '/articles/my-awesome-article-1',
    description: 'A page that user sent data from',
  })
  @IsOptional()
  @IsString()
  pg?: string

  @ApiProperty({
    example: 'en-GB',
    description: "User's locale",
  })
  @IsOptional()
  @IsString()
  lc?: string

  // Error metrics
  @ApiProperty({
    example: 'ParseError',
    required: true,
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string

  @ApiProperty({
    example: 'Malformed input',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string

  @ApiProperty({
    example: 12,
  })
  @IsOptional()
  @IsNumber()
  lineno?: number

  @ApiProperty({
    example: 510,
  })
  @IsOptional()
  @IsNumber()
  colno?: number

  @ApiProperty({
    example: 'https://example.com/assets/convert.js',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  filename?: string

  @ApiProperty({
    example:
      'Error: Malformed input\n    at parseInput (convert.js:12:5)\n    at main (app.js:45:12)',
    description: 'Stack trace of the error',
    maxLength: 7500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(7500)
  stackTrace?: string

  @ApiProperty({
    example: {
      userId: '12345',
      feature: 'data-export',
      environment: 'production',
    },
    description: 'Error-related metadata object with string values',
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
  meta?: Record<string, string>
}
