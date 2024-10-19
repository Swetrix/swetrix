import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, Matches } from 'class-validator'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'
import { ValidatePeriod } from '../decorators/validate-period.decorator'
import { PID_REGEX } from '../../common/constants'

export class GetFunnelsDto {
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

  @ApiProperty()
  from: string

  @ApiProperty()
  to: string

  @ApiProperty({
    description: 'Timezone to display data in',
    default: DEFAULT_TIMEZONE,
  })
  timezone: string

  @ApiProperty({
    description: 'A stringified array of pages to generate funnel for',
  })
  pages?: string

  @ApiProperty({
    description: 'Funnel ID',
  })
  funnelId?: string
}
