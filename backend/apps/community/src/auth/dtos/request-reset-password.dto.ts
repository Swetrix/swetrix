import { ApiProperty } from '@nestjs/swagger'
import { IsEmail } from 'class-validator'

export class RequestResetPasswordDto {
  @ApiProperty({
    description: 'User email',
    example: 'yourusername@example.com',
    maxLength: 254,
    minLength: 6,
  })
  @IsEmail({}, { message: 'Please enter the valid email.' })
  public readonly email: string
}
