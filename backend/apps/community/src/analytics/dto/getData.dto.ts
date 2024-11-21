import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsEnum, Matches } from 'class-validator'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'
import { ValidatePeriod } from '../decorators/validate-period.decorator'
import { PID_REGEX } from '../../common/constants'

export enum TimeBucketType {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
}

export enum ChartRenderMode {
  PERIODICAL = 'periodical',
  CUMULATIVE = 'cumulative',
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export class GetDataDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

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
    description:
      'A stringified array of properties to filter [{ column, filter, isExclusive }]',
    required: false,
  })
  filters: string

  @ApiProperty({
    description: 'Timezone to display data in',
    default: DEFAULT_TIMEZONE,
  })
  timezone: string

  @ApiProperty({
    description:
      'Mode in which data in chart should be rendered, may be either periodical or cumulative',
    default: ChartRenderMode.PERIODICAL,
  })
  mode?: ChartRenderMode

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  metrics?: string
}
