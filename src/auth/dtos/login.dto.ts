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
    description: 'User entity',
    example: false,
  })
  user: object
}

export class LoginResponseDto extends IntersectionType(
  PickType(RegisterResponseDto, ['accessToken', 'refreshToken'] as const),
  AdditionalInfo,
) {}
