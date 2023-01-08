import {
  ApiProperty,
  IntersectionType,
  OmitType,
  PickType,
} from '@nestjs/swagger'
import { RegisterRequestDto, RegisterResponseDto } from './register.dto'

export class LoginRequestDto extends OmitType(RegisterRequestDto, [
  'checkIfLeaked',
] as const) {}

class AdditionalInfo {
  @ApiProperty({
    description: 'Is two factor authentication enabled',
    example: false,
  })
  isTwoFactorAuthenticationEnabled: boolean
}

export class LoginResponseDto extends IntersectionType(
  PickType(RegisterResponseDto, ['accessToken', 'refreshToken'] as const),
  AdditionalInfo,
) {}
