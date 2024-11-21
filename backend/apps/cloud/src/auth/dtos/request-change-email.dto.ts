import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, MaxLength, MinLength } from 'class-validator'

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
  @MaxLength(50, { message: 'Max length is $constraint1 characters' })
  @MinLength(8, { message: 'Min length is $constraint1 characters' })
  public readonly password: string
}
