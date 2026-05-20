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
  ArrayMaxSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  GoalType,
  GoalMatchType,
  MetadataFilter,
  GoalCondition,
  GoalConditions,
  GoalConditionEventType,
  GoalConditionOperator,
  GoalConditionRelation,
} from '../entity/goal.entity'

// Allowed match types for API (regex is disabled for now)
const ALLOWED_MATCH_TYPES = [GoalMatchType.EXACT, GoalMatchType.CONTAINS]

class MetadataFilterDto implements MetadataFilter {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  value: string
}

const ALLOWED_CONDITION_RELATIONS: GoalConditionRelation[] = ['AND', 'OR']
const ALLOWED_CONDITION_EVENT_TYPES: GoalConditionEventType[] = [
  'any',
  GoalType.PAGEVIEW,
  GoalType.CUSTOM_EVENT,
]
const ALLOWED_CONDITION_OPERATORS: GoalConditionOperator[] = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'exists',
  'not_exists',
]

class GoalConditionDto implements GoalCondition {
  @IsString()
  @IsOptional()
  id?: string

  @IsIn(ALLOWED_CONDITION_EVENT_TYPES)
  eventType: GoalConditionEventType

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  field: string

  @IsIn(ALLOWED_CONDITION_OPERATORS)
  operator: GoalConditionOperator

  @IsString()
  @MaxLength(500)
  @IsOptional()
  value?: string

  @IsString()
  @MaxLength(100)
  @IsOptional()
  metadataKey?: string
}

class GoalConditionsDto implements GoalConditions {
  @IsIn(ALLOWED_CONDITION_RELATIONS)
  relation: GoalConditionRelation

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => GoalConditionDto)
  conditions: GoalConditionDto[]
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
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MetadataFilterDto)
  @IsOptional()
  metadataFilters?: MetadataFilterDto[]

  @ValidateNested()
  @Type(() => GoalConditionsDto)
  @IsOptional()
  conditions?: GoalConditionsDto | null
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
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MetadataFilterDto)
  @IsOptional()
  metadataFilters?: MetadataFilterDto[]

  @ValidateNested()
  @Type(() => GoalConditionsDto)
  @IsOptional()
  conditions?: GoalConditionsDto | null

  @IsBoolean()
  @IsOptional()
  active?: boolean
}
