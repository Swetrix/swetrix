import { ApiProperty } from '@nestjs/swagger'
import { IsEmail } from 'class-validator'

export class RequestResetPasswordDto {
  @ApiProperty({
    description: 'User email',
    example: 'yourusername@example.com',
    maxLength: 254,
    minLength: 6,
  })
  @IsEmail({}, { message: 'validation.isEmail' })
  public readonly email: string
}
