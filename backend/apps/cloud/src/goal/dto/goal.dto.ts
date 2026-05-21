import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
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
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string

  @ApiProperty()
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
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  id?: string

  @ApiProperty({ enum: ALLOWED_CONDITION_EVENT_TYPES })
  @IsIn(ALLOWED_CONDITION_EVENT_TYPES)
  eventType: GoalConditionEventType

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  field: string

  @ApiProperty({ enum: ALLOWED_CONDITION_OPERATORS })
  @IsIn(ALLOWED_CONDITION_OPERATORS)
  operator: GoalConditionOperator

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(500)
  @IsOptional()
  value?: string

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  metadataKey?: string
}

class GoalConditionsDto implements GoalConditions {
  @ApiProperty({ enum: ALLOWED_CONDITION_RELATIONS })
  @IsIn(ALLOWED_CONDITION_RELATIONS)
  relation: GoalConditionRelation

  @ApiProperty({ type: [GoalConditionDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => GoalConditionDto)
  conditions: GoalConditionDto[]
}

export class CreateGoalDto {
  @ApiProperty({ description: 'Project ID' })
  @IsString()
  @IsNotEmpty()
  pid: string

  @ApiProperty({ description: 'Goal name' })
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  name: string

  @ApiProperty({ enum: GoalType, description: 'Type of goal' })
  @IsEnum(GoalType)
  type: GoalType

  @ApiProperty({
    enum: [GoalMatchType.EXACT, GoalMatchType.CONTAINS],
    description: 'How to match the value',
  })
  @IsIn(ALLOWED_MATCH_TYPES, {
    message: 'matchType must be either "exact" or "contains"',
  })
  matchType: GoalMatchType

  @ApiPropertyOptional({ description: 'Page path or event name to match' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  value?: string

  @ApiPropertyOptional({
    type: [MetadataFilterDto],
    description: 'Optional metadata filters',
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MetadataFilterDto)
  @IsOptional()
  metadataFilters?: MetadataFilterDto[]

  @ApiPropertyOptional({ type: GoalConditionsDto })
  @ValidateNested()
  @Type(() => GoalConditionsDto)
  @IsOptional()
  conditions?: GoalConditionsDto | null
}

export class UpdateGoalDto {
  @ApiPropertyOptional({ description: 'Goal name' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ enum: GoalType, description: 'Type of goal' })
  @IsEnum(GoalType)
  @IsOptional()
  type?: GoalType

  @ApiPropertyOptional({
    enum: [GoalMatchType.EXACT, GoalMatchType.CONTAINS],
    description: 'How to match the value',
  })
  @IsIn(ALLOWED_MATCH_TYPES, {
    message: 'matchType must be either "exact" or "contains"',
  })
  @IsOptional()
  matchType?: GoalMatchType

  @ApiPropertyOptional({ description: 'Page path or event name to match' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  value?: string

  @ApiPropertyOptional({
    type: [MetadataFilterDto],
    description: 'Optional metadata filters',
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MetadataFilterDto)
  @IsOptional()
  metadataFilters?: MetadataFilterDto[]

  @ApiPropertyOptional({ type: GoalConditionsDto })
  @ValidateNested()
  @Type(() => GoalConditionsDto)
  @IsOptional()
  conditions?: GoalConditionsDto | null

  @ApiPropertyOptional({ description: 'Whether the goal is active' })
  @IsBoolean()
  @IsOptional()
  active?: boolean
}

export class GoalDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty({ enum: GoalType })
  type: GoalType

  @ApiProperty({ enum: GoalMatchType })
  matchType: GoalMatchType

  @ApiPropertyOptional()
  value: string | null

  @ApiPropertyOptional({ type: [MetadataFilterDto] })
  metadataFilters: MetadataFilterDto[] | null

  @ApiPropertyOptional({ type: GoalConditionsDto })
  conditions: GoalConditionsDto | null

  @ApiProperty()
  active: boolean

  @ApiProperty()
  pid: string

  @ApiProperty()
  created: Date
}

export class GoalStatsDto {
  @ApiProperty({ description: 'Total number of conversions' })
  conversions: number

  @ApiProperty({ description: 'Number of unique sessions that converted' })
  uniqueSessions: number

  @ApiProperty({ description: 'Conversion rate as percentage' })
  conversionRate: number

  @ApiProperty({ description: 'Previous period conversions for trend' })
  previousConversions: number

  @ApiProperty({ description: 'Trend percentage change' })
  trend: number

  @ApiPropertyOptional({ description: 'Conversion segment breakdowns' })
  breakdowns?: Record<string, Record<string, number>>

  @ApiPropertyOptional({ description: 'Conversion timing metrics' })
  timeToConvert?: Record<string, Record<string, number | null>>
}
