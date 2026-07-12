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
import { V2BaseQueryDto, V2ProjectParamsDto } from './v2-base.dto'

export const V2_MAX_ENTITY_LIMIT = 150

class V2EntityListDto extends V2BaseQueryDto {
  @ApiProperty({
    required: false,
    default: 30,
    maximum: V2_MAX_ENTITY_LIMIT,
    description: 'Number of rows to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(V2_MAX_ENTITY_LIMIT)
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

export class V2SessionsQueryDto extends V2EntityListDto {
  @ApiProperty({
    required: false,
    enum: ['traffic', 'performance', 'error'],
    default: 'traffic',
    description:
      'Event scope for the returned sessions: sessions with traffic events (default), performance events, or errors in the selected range.',
  })
  @IsOptional()
  @IsIn(['traffic', 'performance', 'error'], {
    message: 'The provided event_type is incorrect',
  })
  event_type?: 'traffic' | 'performance' | 'error'
}

export class V2ProfilesQueryDto extends V2EntityListDto {
  @ApiProperty({
    required: false,
    enum: ['all', 'anonymous', 'identified'],
    default: 'all',
    description: 'Filter profiles by type',
  })
  @IsOptional()
  @IsIn(['all', 'anonymous', 'identified'], {
    message: 'The provided profile_type is incorrect',
  })
  profile_type?: 'all' | 'anonymous' | 'identified'
}

export class V2ErrorsQueryDto extends V2EntityListDto {
  @ApiProperty({
    required: false,
    default: false,
    description: 'Include resolved error groups in the list',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  show_resolved?: boolean
}

export class V2ErrorDetailQueryDto extends V2BaseQueryDto {
  @ApiProperty({
    required: false,
    enum: TimeBucketType,
    description:
      'Time bucket for the error occurrence chart. Defaults to the lowest bucket allowed for the requested range.',
  })
  @IsOptional()
  @IsEnum(TimeBucketType, { message: 'The provided timeBucket is incorrect' })
  timeBucket?: TimeBucketType
}

export class V2ErrorSessionsQueryDto extends V2BaseQueryDto {
  @ApiProperty({ required: false, default: 10, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number
}

export class V2TimezoneQueryDto {
  @ApiProperty({
    required: false,
    description: 'IANA timezone used for displayed dates',
  })
  @IsOptional()
  @IsString()
  timezone?: string
}

export class V2SessionParamsDto extends V2ProjectParamsDto {
  @ApiProperty({ description: 'The session identifier' })
  @IsNotEmpty()
  @IsString()
  psid: string
}

export class V2ProfileParamsDto extends V2ProjectParamsDto {
  @ApiProperty({ description: 'The profile identifier' })
  @IsNotEmpty()
  @IsString()
  profileId: string
}

export class V2ErrorParamsDto extends V2ProjectParamsDto {
  @ApiProperty({ description: 'The error group identifier (eid)' })
  @IsNotEmpty()
  @IsString()
  eid: string
}
