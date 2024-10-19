import { IsNotEmpty, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { PID_REGEX } from '../../common/constants'

export class LiveVisitorsDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string
}
