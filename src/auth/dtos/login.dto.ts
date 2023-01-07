import { OmitType, PickType } from '@nestjs/swagger'
import { RegisterRequestDto, RegisterResponseDto } from './register.dto'

export class LoginRequestDto extends OmitType(RegisterRequestDto, [
  'checkIfLeaked',
] as const) {}

export class LoginResponseDto extends PickType(RegisterResponseDto, [
  'accessToken',
  'refreshToken',
] as const) {}
