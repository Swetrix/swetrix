import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class PasswordChangeDTO {
  @ApiProperty({ example: 'your_password123' })
  @IsNotEmpty()
  password: string
}
