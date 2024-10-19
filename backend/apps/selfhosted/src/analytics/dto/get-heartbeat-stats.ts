import { IsOptional, Matches, ValidateIf } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { PID_REGEX } from '../../common/constants'

export class GetHeartbeatStatsDto {
  @ApiProperty({ description: 'Array of project IDs', required: false })
  @ValidateIf(o => o.pids || !o.pid)
  @IsOptional()
  @Matches(PID_REGEX, {
    message: 'One of the provided Project IDs (pids) is incorrect',
    each: true,
  })
  pids?: string[]

  @ApiProperty({ description: 'Single project ID', required: false })
  @ValidateIf(o => !o.pids || o.pid)
  @IsOptional()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid?: string
}
