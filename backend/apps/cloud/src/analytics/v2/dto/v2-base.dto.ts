import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator'

import { PID_REGEX } from '../../../common/constants'
import { DEFAULT_TIMEZONE } from '../../../user/entities/user.entity'
import { ValidatePeriod } from '../../decorators/validate-period.decorator'
import { ChartRenderMode, TimeBucketType } from '../../dto/getData.dto'

export const V2_DEFAULT_PERIOD = '7d'

export class V2ProjectParamsDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string
}

export class V2BaseQueryDto {
  @ApiProperty({
    required: false,
    description:
      "Predefined reporting period. One of: 1h, today, yesterday, 1d, 7d, 4w, 3M, 12M, 24M, all. Defaults to '7d'. Mutually exclusive with from/to.",
    example: '7d',
  })
  @IsOptional()
  @ValidatePeriod()
  period?: string

  @ApiProperty({
    required: false,
    description:
      'Custom range start (ISO 8601 date or datetime). Must be used together with `to`.',
    example: '2026-06-01',
  })
  @IsOptional()
  @IsString()
  from?: string

  @ApiProperty({
    required: false,
    description:
      'Custom range end (ISO 8601 date or datetime). Must be used together with `from`.',
    example: '2026-06-30',
  })
  @IsOptional()
  @IsString()
  to?: string

  @ApiProperty({
    required: false,
    description: 'IANA timezone used for bucketing and date boundaries',
    default: DEFAULT_TIMEZONE,
    example: 'Europe/Kyiv',
  })
  @IsOptional()
  @IsString()
  timezone?: string

  @ApiProperty({
    required: false,
    description:
      'JSON array of filter objects: [{ "dimension": "country", "operator": "is" | "is_not" | "contains" | "contains_not", "value": "US" | ["US", "DE"] | null, "key": "<meta key, for event_metadata / page_property>" }]',
    example: '[{"dimension":"country","operator":"is","value":"US"}]',
  })
  @IsOptional()
  @IsString()
  filters?: string
}

export class V2TimeseriesDto extends V2BaseQueryDto {
  @ApiProperty({
    required: false,
    enum: TimeBucketType,
    description:
      'Time bucket for grouping. Defaults to the lowest bucket allowed for the requested range.',
  })
  @IsOptional()
  @IsEnum(TimeBucketType, { message: 'The provided timeBucket is incorrect' })
  timeBucket?: TimeBucketType

  @ApiProperty({
    required: false,
    description:
      'Comma-separated metric names to return. Defaults depend on the data type.',
    example: 'visitors,pageviews',
  })
  @IsOptional()
  @IsString()
  metrics?: string

  @ApiProperty({
    required: false,
    enum: ChartRenderMode,
    default: ChartRenderMode.PERIODICAL,
    description: 'Return periodical (per-bucket) or cumulative values',
  })
  @IsOptional()
  @IsEnum(ChartRenderMode, { message: 'The provided mode is incorrect' })
  mode?: ChartRenderMode
}

const V2_MAX_BREAKDOWN_LIMIT = 100

export class V2BreakdownDto extends V2BaseQueryDto {
  @ApiProperty({
    description: "Dimension to break down by, e.g. 'country', 'page'",
    example: 'country',
  })
  @IsNotEmpty()
  @IsString()
  dimension: string

  @ApiProperty({
    required: false,
    description:
      'Comma-separated metric names to compute per dimension value. Defaults depend on the data type.',
    example: 'visitors,pageviews',
  })
  @IsOptional()
  @IsString()
  metrics?: string

  @ApiProperty({
    required: false,
    default: 30,
    maximum: V2_MAX_BREAKDOWN_LIMIT,
    description: 'Number of rows to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(V2_MAX_BREAKDOWN_LIMIT)
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
    description:
      "Sorting as 'field:direction', where field is 'value' or a selected metric and direction is 'asc' or 'desc'. Defaults to the first selected metric, descending.",
    example: 'visitors:desc',
  })
  @IsOptional()
  @IsString()
  sort?: string
}

export class V2SummaryDto extends V2BaseQueryDto {}

export class V2ListQueryDto extends V2BaseQueryDto {
  @ApiProperty({
    required: false,
    default: 30,
    maximum: V2_MAX_BREAKDOWN_LIMIT,
    description: 'Number of rows to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(V2_MAX_BREAKDOWN_LIMIT)
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
}
