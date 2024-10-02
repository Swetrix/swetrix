import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'
import { DEFAULT_TIMEZONE } from '../../user/entities/user.entity'

// eslint-disable-next-line @typescript-eslint/naming-convention
export class GetSessionDto {
  @ApiProperty()
  @IsNotEmpty()
  pid: string

  @ApiProperty()
  @IsNotEmpty()
  psid: string

  @ApiProperty({
    description: 'Timezone to display data in',
    default: DEFAULT_TIMEZONE,
  })
  timezone: string
}
