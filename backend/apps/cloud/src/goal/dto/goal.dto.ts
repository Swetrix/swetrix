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
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator'
import { Type } from 'class-transformer'
import { GoalType, GoalMatchType, MetadataFilter } from '../entity/goal.entity'

// Maximum regex length to prevent ReDoS attacks
const MAX_REGEX_LENGTH = 200

// Patterns that could cause catastrophic backtracking (ReDoS)
const DANGEROUS_REGEX_PATTERNS = [
  /(\+|\*|\?)\1{2,}/, // Nested quantifiers like +++, ***, ???
  /\(\?[^)]*\)\+/, // Possessive quantifiers (not supported, but flag anyway)
  /\([^)]*\)\{\d+,\}.*\1/, // Backreferences with quantifiers
  /(\.\*){3,}/, // Multiple consecutive .* patterns
  /\([^)]*\|[^)]*\)\+/, // Alternation with + quantifier
]

@ValidatorConstraint({ name: 'safeRegex', async: false })
export class SafeRegexConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments): boolean {
    const obj = args.object as any

    // Only validate if matchType is regex
    if (obj.matchType !== GoalMatchType.REGEX) {
      return true
    }

    if (!value) {
      return true
    }

    // Check length
    if (value.length > MAX_REGEX_LENGTH) {
      return false
    }

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_REGEX_PATTERNS) {
      if (pattern.test(value)) {
        return false
      }
    }

    // Try to compile the regex to ensure it's valid
    try {
      new RegExp(value)
      return true
    } catch {
      return false
    }
  }

  defaultMessage(_args: ValidationArguments): string {
    return `Invalid regex pattern. Ensure the pattern is valid, not longer than ${MAX_REGEX_LENGTH} characters, and doesn't contain potentially dangerous constructs.`
  }
}

export class MetadataFilterDto implements MetadataFilter {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  value: string
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

  @ApiProperty({ enum: GoalMatchType, description: 'How to match the value' })
  @IsEnum(GoalMatchType)
  matchType: GoalMatchType

  @ApiPropertyOptional({ description: 'Page path or event name to match' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  @Validate(SafeRegexConstraint)
  value?: string

  @ApiPropertyOptional({
    type: [MetadataFilterDto],
    description: 'Optional metadata filters',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetadataFilterDto)
  @IsOptional()
  metadataFilters?: MetadataFilterDto[]
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
    enum: GoalMatchType,
    description: 'How to match the value',
  })
  @IsEnum(GoalMatchType)
  @IsOptional()
  matchType?: GoalMatchType

  @ApiPropertyOptional({ description: 'Page path or event name to match' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  @Validate(SafeRegexConstraint)
  value?: string

  @ApiPropertyOptional({
    type: [MetadataFilterDto],
    description: 'Optional metadata filters',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetadataFilterDto)
  @IsOptional()
  metadataFilters?: MetadataFilterDto[]

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
}
