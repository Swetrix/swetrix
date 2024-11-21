import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  Matches,
  Validate,
} from 'class-validator'

import {
  MAX_METADATA_KEYS,
  MAX_METADATA_VALUE_LENGTH,
  MetadataKeysQuantity,
  MetadataValueType,
  MetadataSizeLimit,
} from './events.dto'
import { PID_REGEX } from '../../common/constants'

export class PageviewsDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  // Tracking metrics
  @ApiProperty({
    example: 'Europe/Kiev',
    description: "User's timezone",
  })
  tz?: string

  @ApiProperty({
    example: '/articles/my-awesome-article-1',
    description: 'A page that user sent data from',
  })
  pg?: string

  @ApiProperty({
    example: 'en-GB',
    description: "User's locale",
  })
  lc?: string

  @ApiProperty({
    example: 'https://example.com',
    description: 'The referrer',
  })
  ref?: string

  @ApiProperty({
    example: 'duckduckgo',
    description: 'utm_source URL parameter',
  })
  so?: string

  @ApiProperty({
    example: 'cpc',
    description: 'utm_medium URL parameter',
  })
  me?: string

  @ApiProperty({
    example: 'spring_sale',
    description: 'utm_campaign URL parameter',
  })
  ca?: string

  @ApiProperty({
    example: 'running+shoes',
    description: 'utm_term URL parameter',
  })
  te?: string

  @ApiProperty({
    example: 'logolink',
    description: 'utm_content URL parameter',
  })
  co?: string

  @ApiProperty({
    example: false,
    description: 'If true, only unique events will be saved',
  })
  unique?: boolean

  @ApiProperty({
    example: {
      conn: 120,
      dns: 170,
      dom_load: 975.5,
      page_load: 1515,
      render: 532.25,
      response: 170,
      tls: 0,
      ttfb: 78.3,
    },
    description: 'Performance metrics',
  })
  perf?: {
    dns: number
    tls: number
    conn: number
    response: number
    render: number
    dom_load: number
    page_load: number
    ttfb: number
  }

  @ApiProperty({
    example: {
      affiliate: 'Yes',
      protocol: 'HTTPS',
    },
    description: 'Event-related metadata object with string values',
  })
  @IsOptional()
  @IsObject()
  @Validate(MetadataKeysQuantity, {
    message: `Metadata object can't have more than ${MAX_METADATA_KEYS} keys`,
  })
  @Validate(MetadataValueType, {
    message: 'All of metadata object values must be strings',
  })
  @Validate(MetadataSizeLimit, {
    message: `Metadata object can't have values with total length more than ${MAX_METADATA_VALUE_LENGTH} characters`,
  })
  meta?: Record<string, string>
}
