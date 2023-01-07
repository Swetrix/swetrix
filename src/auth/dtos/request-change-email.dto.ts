import { ApiProperty } from '@nestjs/swagger'
import { IsEmail } from 'class-validator'
import { IsPassword } from '../decorators'

export class RequestChangeEmailDto {
  @ApiProperty({
    description: 'User email',
    example: 'yourusername@example.com',
    maxLength: 254,
    minLength: 6,
  })
  @IsEmail({}, { message: 'Please enter the valid email.' })
  public readonly newEmail: string

  @ApiProperty({
    description: 'User password',
    example: '%d7*c4W45p',
    maxLength: 72,
    minLength: 8,
  })
  @IsPassword({ message: 'Please enter the valid password.' })
  public readonly password: string
}
