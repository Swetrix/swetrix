import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'
import { TimeBucketType } from './getData.dto'

export class GetMonitorDataDto {
  @ApiProperty()
  @IsNotEmpty()
  pid: string

  @ApiProperty()
  @IsNotEmpty()
  monitorId: number

  @ApiProperty()
  @IsNotEmpty()
  monitorGroupId: string

  @ApiProperty()
  period: string

  @ApiProperty({ enum: TimeBucketType })
  @IsNotEmpty()
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
