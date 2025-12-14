import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsUUID,
  IsNotEmpty,
  Matches,
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  ExperimentStatus,
  ExposureTrigger,
  MultipleVariantHandling,
  FeatureFlagMode,
} from '../entity/experiment.entity'
import { PID_REGEX } from '../../common/constants'

export class ExperimentVariantDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  key: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage: number

  @ApiProperty()
  @IsBoolean()
  isControl: boolean
}

export class CreateExperimentDto {
  @ApiProperty({
    description: 'The project ID',
    example: 'aHbCdEfGhIjK',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  hypothesis?: string

  @ApiPropertyOptional({ enum: ExposureTrigger })
  @IsOptional()
  @IsEnum(ExposureTrigger)
  exposureTrigger?: ExposureTrigger

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customEventName?: string

  @ApiPropertyOptional({ enum: MultipleVariantHandling })
  @IsOptional()
  @IsEnum(MultipleVariantHandling)
  multipleVariantHandling?: MultipleVariantHandling

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  filterInternalUsers?: boolean

  @ApiPropertyOptional({ enum: FeatureFlagMode })
  @IsOptional()
  @IsEnum(FeatureFlagMode)
  featureFlagMode?: FeatureFlagMode

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  featureFlagKey?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  existingFeatureFlagId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  goalId?: string

  @ApiProperty({ type: [ExperimentVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperimentVariantDto)
  variants: ExperimentVariantDto[]
}

export class UpdateExperimentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  hypothesis?: string

  @ApiPropertyOptional({ enum: ExposureTrigger })
  @IsOptional()
  @IsEnum(ExposureTrigger)
  exposureTrigger?: ExposureTrigger

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customEventName?: string

  @ApiPropertyOptional({ enum: MultipleVariantHandling })
  @IsOptional()
  @IsEnum(MultipleVariantHandling)
  multipleVariantHandling?: MultipleVariantHandling

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  filterInternalUsers?: boolean

  @ApiPropertyOptional({ enum: FeatureFlagMode })
  @IsOptional()
  @IsEnum(FeatureFlagMode)
  featureFlagMode?: FeatureFlagMode

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  featureFlagKey?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  existingFeatureFlagId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  goalId?: string

  @ApiPropertyOptional({ type: [ExperimentVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperimentVariantDto)
  variants?: ExperimentVariantDto[]
}

export class ExperimentDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  description: string | null

  @ApiProperty()
  hypothesis: string | null

  @ApiProperty({ enum: ExperimentStatus })
  status: ExperimentStatus

  @ApiProperty({ enum: ExposureTrigger })
  exposureTrigger: ExposureTrigger

  @ApiProperty()
  customEventName: string | null

  @ApiProperty({ enum: MultipleVariantHandling })
  multipleVariantHandling: MultipleVariantHandling

  @ApiProperty()
  filterInternalUsers: boolean

  @ApiProperty({ enum: FeatureFlagMode })
  featureFlagMode: FeatureFlagMode

  @ApiProperty()
  featureFlagKey: string | null

  @ApiProperty()
  startedAt: Date | null

  @ApiProperty()
  endedAt: Date | null

  @ApiProperty()
  pid: string

  @ApiProperty()
  goalId: string | null

  @ApiProperty()
  featureFlagId: string | null

  @ApiProperty({ type: [ExperimentVariantDto] })
  variants: ExperimentVariantDto[]

  @ApiProperty()
  created: Date
}

export class VariantResultDto {
  @ApiProperty()
  key: string

  @ApiProperty()
  name: string

  @ApiProperty()
  isControl: boolean

  @ApiProperty()
  exposures: number

  @ApiProperty()
  conversions: number

  @ApiProperty()
  conversionRate: number

  @ApiProperty()
  probabilityOfBeingBest: number

  @ApiProperty()
  improvement: number
}

export class ExperimentChartDataDto {
  @ApiProperty({ type: [String], description: 'X-axis timestamps' })
  x: string[]

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'number' } },
    description:
      'Win probability for each variant over time. Keys are variant keys.',
  })
  winProbability: Record<string, number[]>
}

export class ExperimentResultsDto {
  @ApiProperty()
  experimentId: string

  @ApiProperty()
  status: ExperimentStatus

  @ApiProperty({ type: [VariantResultDto] })
  variants: VariantResultDto[]

  @ApiProperty()
  totalExposures: number

  @ApiProperty()
  totalConversions: number

  @ApiProperty()
  hasWinner: boolean

  @ApiProperty()
  winnerKey: string | null

  @ApiProperty()
  confidenceLevel: number

  @ApiPropertyOptional({ type: ExperimentChartDataDto })
  chart?: ExperimentChartDataDto

  @ApiPropertyOptional({
    type: [String],
    description: 'Allowed time buckets when period is "all"',
  })
  timeBucket?: string[]
}
