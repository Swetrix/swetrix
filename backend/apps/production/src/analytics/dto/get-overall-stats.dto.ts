import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, ValidateIf } from 'class-validator'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'
import { ValidatePeriod } from '../decorators/validate-period.decorator'

export class GetOverallStatsDto {
  @ApiProperty({ description: 'Array of project IDs', required: false })
  @ValidateIf(o => o.pids || !o.pid)
  @IsOptional()
  @IsString({ each: true })
  pids?: string[]

  @ApiProperty({ description: 'Single project ID', required: false })
  @ValidateIf(o => !o.pids || o.pid)
  @IsOptional()
  @IsString()
  pid?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidatePeriod()
  period?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  from?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  to?: string

  @ApiProperty({
    description: 'Timezone to display data in',
    default: DEFAULT_TIMEZONE,
  })
  @IsOptional()
  @IsString()
  timezone?: string = DEFAULT_TIMEZONE

  @ApiProperty({
    description: 'A stringified array of properties to filter',
    required: false,
  })
  @IsOptional()
  @IsString()
  filters?: string
}
