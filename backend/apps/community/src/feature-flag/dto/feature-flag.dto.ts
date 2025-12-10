import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  Matches,
  ArrayMaxSize,
  IsIn,
} from 'class-validator'
import { Type } from 'class-transformer'
import { FeatureFlagType, TargetingRule } from '../entity/feature-flag.entity'

// Valid targeting rule columns (attribute keys)
export const VALID_TARGETING_COLUMNS = [
  'cc', // country code
  'ct', // city
  'rg', // region
  'dv', // device type
  'br', // browser
  'os', // operating system
] as const

export class TargetingRuleDto implements TargetingRule {
  @ApiProperty({
    description: 'Column/attribute to filter on (cc, ct, rg, dv, br, os)',
    enum: VALID_TARGETING_COLUMNS,
  })
  @IsString()
  @IsIn(VALID_TARGETING_COLUMNS, {
    message: 'Column must be one of: cc, ct, rg, dv, br, os',
  })
  column: string

  @ApiProperty({ description: 'Value to match against' })
  @IsString()
  @MaxLength(256)
  filter: string

  @ApiProperty({
    description: 'If true, excludes matches; if false, includes matches',
  })
  @IsBoolean()
  isExclusive: boolean
}

export class CreateFeatureFlagDto {
  @ApiProperty({ description: 'Project ID the flag belongs to' })
  @IsString()
  pid: string

  @ApiProperty({
    description: 'Unique key for the feature flag (kebab-case recommended)',
  })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Key must contain only alphanumeric characters, underscores, and hyphens',
  })
  key: string

  @ApiPropertyOptional({
    description: 'Optional description of what this flag controls',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @ApiPropertyOptional({
    enum: FeatureFlagType,
    description: 'Type of feature flag',
    default: FeatureFlagType.BOOLEAN,
  })
  @IsOptional()
  @IsEnum(FeatureFlagType)
  flagType?: FeatureFlagType

  @ApiPropertyOptional({
    description:
      'Percentage of users to enable for (0-100), used when flagType is rollout',
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number

  @ApiPropertyOptional({
    type: [TargetingRuleDto],
    description:
      'Array of targeting rules to filter which visitors see this flag (max 50)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'Cannot have more than 50 targeting rules' })
  @ValidateNested({ each: true })
  @Type(() => TargetingRuleDto)
  targetingRules?: TargetingRuleDto[]

  @ApiPropertyOptional({
    description: 'Whether the flag is enabled',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}

export class UpdateFeatureFlagDto {
  @ApiPropertyOptional({ description: 'Unique key for the feature flag' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Key must contain only alphanumeric characters, underscores, and hyphens',
  })
  key?: string

  @ApiPropertyOptional({
    description: 'Description of what this flag controls',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null

  @ApiPropertyOptional({
    enum: FeatureFlagType,
    description: 'Type of feature flag',
  })
  @IsOptional()
  @IsEnum(FeatureFlagType)
  flagType?: FeatureFlagType

  @ApiPropertyOptional({
    description: 'Percentage of users to enable for (0-100)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number

  @ApiPropertyOptional({
    type: [TargetingRuleDto],
    description: 'Array of targeting rules (max 50)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'Cannot have more than 50 targeting rules' })
  @ValidateNested({ each: true })
  @Type(() => TargetingRuleDto)
  targetingRules?: TargetingRuleDto[] | null

  @ApiPropertyOptional({ description: 'Whether the flag is enabled' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}

export class EvaluateFeatureFlagsDto {
  @ApiProperty({ description: 'Project ID to evaluate flags for' })
  @IsString()
  @MaxLength(12)
  pid: string

  @ApiPropertyOptional({
    description:
      'Optional profile ID for long-term user tracking. If not provided, an anonymous profile ID will be generated based on IP and user agent.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  profileId?: string
}

export class FeatureFlagDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  key: string

  @ApiProperty()
  description: string | null

  @ApiProperty({ enum: FeatureFlagType })
  flagType: FeatureFlagType

  @ApiProperty()
  rolloutPercentage: number

  @ApiProperty({ type: [TargetingRuleDto] })
  targetingRules: TargetingRuleDto[] | null

  @ApiProperty()
  enabled: boolean

  @ApiProperty()
  pid: string

  @ApiProperty()
  created: Date
}

export class FeatureFlagStatsDto {
  @ApiProperty({ description: 'Total number of evaluations' })
  evaluations: number

  @ApiProperty({ description: 'Number of unique profiles' })
  profileCount: number

  @ApiProperty({ description: 'Number of times flag returned true' })
  trueCount: number

  @ApiProperty({ description: 'Number of times flag returned false' })
  falseCount: number

  @ApiProperty({ description: 'Percentage of true evaluations' })
  truePercentage: number
}

export class EvaluatedFlagsResponseDto {
  @ApiProperty({
    description: 'Map of flag keys to their evaluated boolean values',
    example: { 'new-checkout': true, 'dark-mode': false },
  })
  flags: Record<string, boolean>
}

export class FeatureFlagProfileDto {
  @ApiProperty({ description: 'Profile ID' })
  profileId: string

  @ApiProperty({
    description: 'Whether profile is identified (has user-provided ID)',
  })
  isIdentified: boolean

  @ApiProperty({ description: 'Last evaluation result' })
  lastResult: boolean

  @ApiProperty({ description: 'Total number of evaluations for this profile' })
  evaluationCount: number

  @ApiProperty({ description: 'Most recent evaluation timestamp' })
  lastEvaluated: string
}

export class FeatureFlagProfilesResponseDto {
  @ApiProperty({ type: [FeatureFlagProfileDto] })
  profiles: FeatureFlagProfileDto[]

  @ApiProperty({ description: 'Total number of profiles' })
  total: number
}
