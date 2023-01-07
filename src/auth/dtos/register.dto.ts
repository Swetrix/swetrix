import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsBoolean } from 'class-validator'
import { IsPassword } from '../decorators'

export class RegisterRequestDto {
  @ApiProperty({
    description: 'User email',
    example: 'yourusername@example.com',
    maxLength: 254,
    minLength: 6,
  })
  @IsEmail({}, { message: 'validation.isEmail' })
  public readonly email: string

  @ApiProperty({
    description: 'User password',
    example: '%d7*c4W45p',
    maxLength: 72,
    minLength: 8,
  })
  @IsPassword({ message: 'validation.isPassword' })
  public readonly password: string

  @ApiProperty({
    description: 'Check if password is leaked',
    example: true,
  })
  @IsNotEmpty({ message: 'validation.isNotEmpty' })
  @IsBoolean({ message: 'validation.isBoolean' })
  public readonly checkIfLeaked: boolean
}

export class RegisterResponseDto {
  @ApiProperty({
    description: 'Access token (JWT)',
  })
  public readonly accessToken: string
}
