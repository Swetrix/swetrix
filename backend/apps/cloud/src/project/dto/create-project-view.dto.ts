import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'

import { ApiProperty } from '@nestjs/swagger'
import { ProjectViewType } from '../entity/project-view.entity'
import { ProjectViewCustomEventMetaValueType } from '../entity/project-view-custom-event.entity'

export class ProjectViewCustomEventDto {
  @ApiProperty()
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  @IsNotEmpty()
  customEventName: string

  @ApiProperty()
  @MaxLength(100)
  @IsString()
  @IsOptional()
  metaKey: string

  @ApiProperty()
  @MaxLength(100)
  @IsString()
  @IsOptional()
  metaValue: string

  @ApiProperty()
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  @IsNotEmpty()
  metricKey: string

  @ApiProperty({ enum: ProjectViewCustomEventMetaValueType })
  @IsEnum(ProjectViewCustomEventMetaValueType)
  @IsNotEmpty()
  metaValueType: ProjectViewCustomEventMetaValueType
}

// Saved-view filters are persisted as opaque JSON. New views store the v2
// filter shape; older views may still hold the legacy { column, filter,
// isExclusive } shape, which the web normalises on read.
export interface Filter {
  dimension: string
  operator: 'is' | 'is_not' | 'contains' | 'contains_not'
  value: string | null | (string | null)[]
  key?: string
}

export const MAX_METRICS_IN_VIEW = 3

// Mirrors MAX_FILTERS in analytics.service — the cap applied when filters run
// against ClickHouse, so a saved view can never hold more than a query accepts.
const MAX_FILTERS_IN_VIEW = 100

export class CreateProjectViewDto {
  @ApiProperty()
  @MaxLength(20)
  @MinLength(1)
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({ description: 'Type of the view', enum: ProjectViewType })
  @IsEnum(ProjectViewType)
  @IsNotEmpty()
  type: ProjectViewType

  @ApiProperty({
    description:
      'An array of properties to filter [{ column, filter, isExclusive, isContains }]',
    required: false,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_FILTERS_IN_VIEW)
  filters?: Filter[]

  @ApiProperty({
    type: ProjectViewCustomEventDto,
    required: false,
    isArray: true,
  })
  @ValidateNested()
  @IsOptional()
  @ArrayMaxSize(MAX_METRICS_IN_VIEW)
  customEvents?: ProjectViewCustomEventDto[]
}
