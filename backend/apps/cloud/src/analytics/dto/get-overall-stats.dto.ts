import { ApiProperty } from '@nestjs/swagger'
import {
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  IsBoolean,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'
import { ValidatePeriod } from '../decorators/validate-period.decorator'
import { PID_REGEX } from '../../common/constants'
import { ValidateProjectIds } from '../decorators/validate-project-ids.decorator'

export class GetOverallStatsDto {
  @ApiProperty({ description: 'Array of project IDs', required: false })
  @ValidateIf((o) => o.pids || !o.pid)
  @IsOptional()
  @ValidateProjectIds()
  pids?: string[]

  @ApiProperty({ description: 'Single project ID', required: false })
  @ValidateIf((o) => !o.pids || o.pid)
  @IsOptional()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid?: string

  @ApiProperty({
    description: 'Time bucket to display data in',
    required: false,
  })
  @IsOptional()
  @IsString()
  timeBucket?: string

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

  @ApiProperty({
    description: 'Whether to include simplified chart data for each project',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeChart?: boolean = false
}
