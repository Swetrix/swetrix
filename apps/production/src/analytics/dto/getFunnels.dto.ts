import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'

// eslint-disable-next-line @typescript-eslint/naming-convention
export class GetFunnelsDTO {
  @ApiProperty()
  @IsNotEmpty()
  pid: string

  @ApiProperty()
  period: string

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
