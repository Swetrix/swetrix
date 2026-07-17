import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator'
import { PID_REGEX } from '../../common/constants'

export class IdentifyDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  @ApiProperty({
    example: 'user_12345',
    required: true,
    description:
      'A unique, stable identifier of the user (e.g. an internal user ID). It is hashed before storage; the raw value is never persisted. The current anonymous profile of the visitor gets linked to the resulting identified profile.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(256)
  profileId: string
}
