import { ApiProperty } from '@nestjs/swagger'
import {
  IsEmail,
  IsNotEmpty,
  IsBoolean,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator'

export class RegisterRequestDto {
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
    maxLength: 72,
    minLength: 8,
  })
  @MaxLength(50, { message: 'Max length is $constraint1 characters' })
  @MinLength(8, { message: 'Min length is $constraint1 characters' })
  public readonly password: string

  @ApiProperty({
    description: 'Check if password is leaked',
    example: true,
  })
  @IsNotEmpty({ message: 'This field is required.' })
  @IsBoolean({ message: 'Please enter the valid value (true or false).' })
  public readonly checkIfLeaked: boolean

  @ApiProperty({
    description: 'Affiliate code',
    example: 'ABCDEFGH',
  })
  @IsOptional()
  public readonly refCode?: string
}

export class RegisterResponseDto {
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
