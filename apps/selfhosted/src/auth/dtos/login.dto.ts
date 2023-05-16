import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, MinLength } from 'class-validator'

export class LoginRequestDto {
  @ApiProperty({
    description: 'User email',
    example: 'yourusername@example.com',
    maxLength: 254,
    minLength: 6,
  })
  @IsEmail({}, { message: 'Please enter the valid email.' })
  public readonly email: string

  @ApiProperty({
    description: 'User password',
    example: '%d7*c4W45p',
    minLength: 8,
  })
  @MinLength(8, { message: 'Min length is $constraint1 characters' })
  public readonly password: string
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Access token (JWT)',
  })
  public readonly accessToken: string

  @ApiProperty({
    description: 'Refresh token (JWT)',
  })
  public readonly refreshToken: string

  @ApiProperty({
    description: 'User entity',
  })
  user: object
}
