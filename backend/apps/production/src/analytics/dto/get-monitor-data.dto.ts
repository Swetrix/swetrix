import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'
import { TimeBucketType } from './getData.dto'
import { ValidatePeriod } from '../decorators/validate-period.decorator'

export class GetMonitorDataDto {
  @ApiProperty()
  @IsNotEmpty()
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
