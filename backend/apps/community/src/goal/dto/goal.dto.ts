import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator'
import { Type } from 'class-transformer'
import { GoalType, GoalMatchType, MetadataFilter } from '../entity/goal.entity'

export class MetadataFilterDto implements MetadataFilter {
  @IsString()
  @IsNotEmpty()
  key: string

  @IsString()
  @IsNotEmpty()
  value: string
}

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  pid: string

  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  name: string

  @IsEnum(GoalType)
  type: GoalType

  @IsEnum(GoalMatchType)
  matchType: GoalMatchType

  @IsString()
  @MaxLength(500)
  @IsOptional()
  value?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetadataFilterDto)
  @IsOptional()
  metadataFilters?: MetadataFilterDto[]
}

export class UpdateGoalDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string

  @IsEnum(GoalType)
  @IsOptional()
  type?: GoalType

  @IsEnum(GoalMatchType)
  @IsOptional()
  matchType?: GoalMatchType

  @IsString()
  @MaxLength(500)
  @IsOptional()
  value?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetadataFilterDto)
  @IsOptional()
  metadataFilters?: MetadataFilterDto[]

  @IsBoolean()
  @IsOptional()
  active?: boolean
}

export class GoalDto {
  id: string
  name: string
  type: GoalType
  matchType: GoalMatchType
  value: string | null
  metadataFilters: MetadataFilterDto[] | null
  active: boolean
  pid: string
  created: string
}

export class GoalStatsDto {
  conversions: number
  uniqueSessions: number
  conversionRate: number
  previousConversions: number
  trend: number
}
