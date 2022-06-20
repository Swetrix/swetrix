import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class TwoFactorAuthDTO {
  @ApiProperty({ example: '123456', required: true })
  @IsNotEmpty()
  twoFactorAuthenticationCode: string
}
