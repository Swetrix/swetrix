import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional } from 'class-validator'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'
import { ValidatePeriod } from '../decorators/validate-period.decorator'

// eslint-disable-next-line @typescript-eslint/naming-convention
export class GetFunnelsDto {
  @ApiProperty()
  @IsNotEmpty()
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
  pages: string

  @ApiProperty({
    description: 'Funnel ID',
  })
  funnelId?: string
}
