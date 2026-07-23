import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator'
import { TimeBucketType } from '../../analytics/dto/getData.dto'

export class GetAdsDto {
  @ApiProperty({ description: 'Project ID' })
  @IsNotEmpty()
  @IsString()
  pid: string

  @ApiProperty({ description: 'Time period', example: '7d' })
  @IsNotEmpty()
  @IsString()
  period: string

  @ApiPropertyOptional({ description: 'Start date for custom period' })
  @IsOptional()
  @IsString()
  from?: string

  @ApiPropertyOptional({ description: 'End date for custom period' })
  @IsOptional()
  @IsString()
  to?: string

  @ApiPropertyOptional({ description: 'Timezone', default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string

  @ApiPropertyOptional({
    description: 'Time bucket for chart data (day or coarser)',
    enum: TimeBucketType,
  })
  @IsOptional()
  @IsEnum(TimeBucketType)
  timeBucket?: TimeBucketType
}
