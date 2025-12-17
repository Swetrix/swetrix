import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator'
import { Transform, Type } from 'class-transformer'

export class GetRevenueDto {
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

  @ApiPropertyOptional({ description: 'Time bucket for chart data' })
  @IsOptional()
  @IsString()
  timeBucket?: string
}

export class GetRevenueTransactionsDto extends GetRevenueDto {
  @ApiPropertyOptional({ description: 'Number of items to take', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number

  @ApiPropertyOptional({ description: 'Number of items to skip', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number

  @ApiPropertyOptional({
    description: 'Filter by type (sale, refund, subscription)',
  })
  @IsOptional()
  @IsString()
  type?: string

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string
}
