import { ApiProperty } from '@nestjs/swagger'
import { IsPassword } from '../decorators'

export class ResetPasswordDto {
  @ApiProperty({
    description: 'User password',
    example: '%d7*c4W45p',
    maxLength: 72,
    minLength: 8,
  })
  @IsPassword({ message: 'Please enter the valid password.' })
  public readonly newPassword: string
}
