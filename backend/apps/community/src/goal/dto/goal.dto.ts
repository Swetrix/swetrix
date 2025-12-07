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
  @Validate(SafeRegexConstraint)
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
  @Validate(SafeRegexConstraint)
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
