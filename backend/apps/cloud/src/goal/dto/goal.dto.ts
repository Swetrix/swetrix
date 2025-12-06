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
} from 'class-validator'
import { Type } from 'class-transformer'
import { GoalType, GoalMatchType, MetadataFilter } from '../entity/goal.entity'

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
