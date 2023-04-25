import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'

export enum TimeBucketType {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export class GetUserFlowDTO {
  @ApiProperty()
  @IsNotEmpty()
  pid: string

  @ApiProperty()
  period: string

  @ApiProperty({ enum: TimeBucketType })
  @IsNotEmpty()
  timeBucket: TimeBucketType

  @ApiProperty()
  from: string

  @ApiProperty()
  to: string

  @ApiProperty({
    description: 'Timezone to display data in',
    default: DEFAULT_TIMEZONE,
  })
  timezone: string
}
