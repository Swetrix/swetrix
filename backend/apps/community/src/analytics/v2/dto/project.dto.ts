import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'

import { TimeBucketType } from '../../dto/getData.dto'
import { V2_MAX_ENTITY_LIMIT } from './entities.dto'
import { V2BaseQueryDto, V2ProjectParamsDto } from './v2-base.dto'

export class V2FunnelQueryDto extends V2BaseQueryDto {
  @ApiProperty({
    required: false,
    description:
      'JSON array of page paths / custom event names defining the funnel steps. Mutually exclusive with funnelId.',
    example: '["/","/pricing","/signup"]',
  })
  @IsOptional()
  @IsString()
  steps?: string

  @ApiProperty({
    required: false,
    description: 'ID of a saved funnel. Mutually exclusive with steps.',
  })
  @IsOptional()
  @IsString()
  funnelId?: string
}

export class V2FunnelSessionsQueryDto extends V2FunnelQueryDto {
  @ApiProperty({
    description:
      'Funnel step number the sessions must have reached (1-indexed)',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  step: number

  @ApiProperty({
    required: false,
    default: false,
    description:
      'Return sessions that reached the requested step but did not continue to the next one',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  dropoff?: boolean

  @ApiProperty({ required: false, default: 30, maximum: V2_MAX_ENTITY_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(V2_MAX_ENTITY_LIMIT)
  limit?: number

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number
}

export class V2DimensionsQueryDto {
  @ApiProperty({
    required: false,
    enum: ['traffic', 'performance', 'captcha', 'errors'],
    default: 'traffic',
    description: 'Data type to list dimensions and metrics for',
  })
  @IsOptional()
  @IsIn(['traffic', 'performance', 'captcha', 'errors'], {
    message: 'The provided type is incorrect',
  })
  type?: 'traffic' | 'performance' | 'captcha' | 'errors'
}

export class V2DimensionValuesParamsDto extends V2ProjectParamsDto {
  @ApiProperty({ description: "Dimension name, e.g. 'browser'" })
  @IsNotEmpty()
  @IsString()
  dimension: string
}

export class V2DimensionValuesQueryDto {
  @ApiProperty({
    required: false,
    enum: ['traffic', 'errors'],
    default: 'traffic',
    description: 'Data type to list dimension values for',
  })
  @IsOptional()
  @IsIn(['traffic', 'errors'], { message: 'The provided type is incorrect' })
  type?: 'traffic' | 'errors'
}

export class V2CustomMetricsQueryDto extends V2BaseQueryDto {
  @ApiProperty({
    description:
      'JSON array of custom metric definitions (project view custom events)',
  })
  @IsNotEmpty()
  @IsString()
  metrics: string
}

export class V2EventMetadataQueryDto extends V2BaseQueryDto {
  @ApiProperty({ description: 'Custom event name to return metadata for' })
  @IsNotEmpty()
  @IsString()
  event: string

  @ApiProperty({ required: false, enum: TimeBucketType })
  @IsOptional()
  @IsEnum(TimeBucketType, { message: 'The provided timeBucket is incorrect' })
  timeBucket?: TimeBucketType
}

export class V2PropertyMetadataQueryDto extends V2BaseQueryDto {
  @ApiProperty({ description: 'Page property (tag) name to return values for' })
  @IsNotEmpty()
  @IsString()
  property: string

  @ApiProperty({ required: false, enum: TimeBucketType })
  @IsOptional()
  @IsEnum(TimeBucketType, { message: 'The provided timeBucket is incorrect' })
  timeBucket?: TimeBucketType
}

export class V2CustomEventsTimeseriesDto extends V2BaseQueryDto {
  @ApiProperty({
    description:
      'Custom event names to chart: a comma-separated list or a JSON array',
    example: 'signup,purchase',
  })
  @IsNotEmpty()
  @IsString()
  events: string

  @ApiProperty({ required: false, enum: TimeBucketType })
  @IsOptional()
  @IsEnum(TimeBucketType, { message: 'The provided timeBucket is incorrect' })
  timeBucket?: TimeBucketType
}
