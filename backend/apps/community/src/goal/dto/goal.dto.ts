import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
  IsBoolean,
  IsNotEmpty,
  IsIn,
} from 'class-validator'
import { Type } from 'class-transformer'
import { GoalType, GoalMatchType, MetadataFilter } from '../entity/goal.entity'

// Allowed match types for API (regex is disabled for now)
const ALLOWED_MATCH_TYPES = [GoalMatchType.EXACT, GoalMatchType.CONTAINS]

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

  @IsIn(ALLOWED_MATCH_TYPES, {
    message: 'matchType must be either "exact" or "contains"',
  })
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

  @IsIn(ALLOWED_MATCH_TYPES, {
    message: 'matchType must be either "exact" or "contains"',
  })
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
