import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export enum TimeBucketType {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class AnalyticsGET_DTO {
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
}
