import { ApiProperty } from '@nestjs/swagger'
import { MaxLength, MinLength } from 'class-validator'

export class ChangePasswordDto {
  @ApiProperty({
    description: 'User password',
    example: '%d7*c4W45p',
    maxLength: 72,
    minLength: 8,
  })
  @MaxLength(50, { message: 'Max length is $constraint1 characters' })
  @MinLength(8, { message: 'Min length is $constraint1 characters' })
  public readonly oldPassword: string

  @ApiProperty({
    description: 'User password',
    example: '%d7*c4W45p',
    maxLength: 72,
    minLength: 8,
  })
  @MaxLength(50, { message: 'Max length is $constraint1 characters' })
  @MinLength(8, { message: 'Min length is $constraint1 characters' })
  public readonly newPassword: string
}
