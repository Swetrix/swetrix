import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional } from 'class-validator'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'
import { ValidatePeriod } from '../decorators/validate-period.decorator'

export class GetUptimeBirdseyeDto {
  @ApiProperty()
  @IsNotEmpty()
  pid: string

  @ApiProperty({ required: false })
  @IsOptional()
  monitorId?: number

  @ApiProperty({ required: false, isArray: true })
  @IsOptional()
  monitorIds?: number[] | string[]

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidatePeriod()
  period?: string

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
