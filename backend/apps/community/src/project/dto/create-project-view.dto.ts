import {
  ArrayMaxSize,
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
import { TRAFFIC_COLUMNS } from '../../common/constants'

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

export interface Filter {
  column: keyof typeof TRAFFIC_COLUMNS
  filter: string
  isExclusive: boolean
  isContains?: boolean
}

export const MAX_METRICS_IN_VIEW = 3

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
