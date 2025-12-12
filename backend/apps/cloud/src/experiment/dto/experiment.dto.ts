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
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  ExperimentStatus,
  ExposureTrigger,
  MultipleVariantHandling,
  FeatureFlagMode,
} from '../entity/experiment.entity'

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
  @ApiProperty()
  @IsString()
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

  // Exposure criteria
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

  // Feature flag configuration
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

  // Exposure criteria
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

  // Feature flag configuration
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

  // Exposure criteria
  @ApiProperty({ enum: ExposureTrigger })
  exposureTrigger: ExposureTrigger

  @ApiProperty()
  customEventName: string | null

  @ApiProperty({ enum: MultipleVariantHandling })
  multipleVariantHandling: MultipleVariantHandling

  @ApiProperty()
  filterInternalUsers: boolean

  // Feature flag configuration
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
  improvement: number // % improvement over control
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
  confidenceLevel: number // e.g., 95 for 95% confidence
}

export class ExperimentStatsDto {
  @ApiProperty()
  exposures: number

  @ApiProperty()
  conversions: number

  @ApiProperty()
  conversionRate: number
}
