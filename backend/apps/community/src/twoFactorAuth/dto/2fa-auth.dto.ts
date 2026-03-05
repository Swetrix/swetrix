import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class TwoFactorAuthDTO {
  @ApiProperty({ example: '123456', required: true })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{6}$/)
  twoFactorAuthenticationCode: string
}
