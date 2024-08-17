import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsOptional } from 'class-validator'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'

export class GetUptimeBirdseyeDto {
  @ApiProperty()
  @IsNotEmpty()
  pid: string

  @ApiProperty({ required: false })
  @IsOptional()
  monitorId?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  monitorIds?: number[]

  @ApiProperty()
  @IsNotEmpty()
  monitorGroupId: string

  @ApiProperty()
  period: string

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
