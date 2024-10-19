import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, Matches } from 'class-validator'
import { PID_REGEX } from '../../common/constants'

export class GetFiltersDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  @ApiProperty({
    example: 'br',
    required: true,
    description: 'Params type. Example: br, os, cc, etc.',
  })
  @IsNotEmpty()
  type: string
}
