import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsOptional, Matches } from 'class-validator'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'
import { TimeBucketType } from './getData.dto'
import { ValidatePeriod } from '../decorators/validate-period.decorator'
import { PID_REGEX } from '../../common/constants'

export class GetMonitorDataDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  @ApiProperty()
  @IsNotEmpty()
  monitorId: number

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidatePeriod()
  period?: string

  @ApiProperty({ enum: TimeBucketType })
  @IsNotEmpty()
  @IsEnum(TimeBucketType, { message: 'The provided timebucket is incorrect' })
  timeBucket: TimeBucketType

  @ApiProperty({ required: false })
  from: string

  @ApiProperty({ required: false })
  to: string

  @ApiProperty({
    description: 'Timezone to display data in',
    default: DEFAULT_TIMEZONE,
  })
  timezone: string
}
