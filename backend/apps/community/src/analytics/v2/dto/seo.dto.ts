import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'

import { TimeBucketType } from '../../dto/getData.dto'
import { SEO_SORT } from '../registry/seo'
import { V2BaseQueryDto } from './v2-base.dto'

const V2_SEO_MAX_BREAKDOWN_LIMIT = 100

/**
 * Search Console reports nothing below hourly granularity, so `minute` is
 * excluded from the buckets a caller may ask for.
 */
export const V2_SEO_TIME_BUCKETS = [
  TimeBucketType.HOUR,
  TimeBucketType.DAY,
  TimeBucketType.MONTH,
  TimeBucketType.YEAR,
] as const

export type V2SeoTimeBucket = (typeof V2_SEO_TIME_BUCKETS)[number]

export class V2SeoSummaryDto extends V2BaseQueryDto {}

export class V2SeoRangeDto extends V2BaseQueryDto {}

export class V2SeoTimeseriesDto extends V2BaseQueryDto {
  @ApiProperty({
    required: false,
    enum: V2_SEO_TIME_BUCKETS,
    description:
      "Time bucket for grouping. One of: hour, day, month, year. Defaults to 'day', or 'hour' for intraday periods.",
  })
  @IsOptional()
  @IsIn(V2_SEO_TIME_BUCKETS as readonly string[], {
    message: `The provided timeBucket is incorrect. Search Console supports: ${V2_SEO_TIME_BUCKETS.join(', ')}`,
  })
  timeBucket?: V2SeoTimeBucket

  @ApiProperty({
    required: false,
    description:
      'Comma-separated metric names to return. Defaults to clicks, impressions, ctr and position.',
    example: 'clicks,impressions',
  })
  @IsOptional()
  @IsString()
  metrics?: string
}

export class V2SeoBreakdownDto extends V2BaseQueryDto {
  @ApiProperty({
    description:
      'Dimension to break down by. One of: query, page, country, device',
    example: 'query',
  })
  @IsNotEmpty()
  @IsString()
  dimension: string

  @ApiProperty({
    required: false,
    description:
      'Comma-separated metric names to compute per dimension value. Defaults to clicks, impressions, ctr and position.',
    example: 'clicks,impressions',
  })
  @IsOptional()
  @IsString()
  metrics?: string

  @ApiProperty({
    required: false,
    default: 30,
    maximum: V2_SEO_MAX_BREAKDOWN_LIMIT,
    description: 'Number of rows to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(V2_SEO_MAX_BREAKDOWN_LIMIT)
  limit?: number

  @ApiProperty({
    required: false,
    default: 0,
    description: 'Number of rows to skip (pagination)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number

  @ApiProperty({
    required: false,
    enum: [SEO_SORT],
    default: SEO_SORT,
    description: `Search Console orders rows by clicks descending and offers no sort control, so '${SEO_SORT}' is the only accepted value.`,
  })
  @IsOptional()
  @IsIn([SEO_SORT], {
    message: `Search Console always orders rows by clicks descending; omit 'sort' or pass '${SEO_SORT}'`,
  })
  sort?: string
}
