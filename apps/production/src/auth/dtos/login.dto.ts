import { ApiProperty, OmitType } from '@nestjs/swagger'
import { RegisterRequestDto } from './register.dto'

export class LoginRequestDto extends OmitType(RegisterRequestDto, [
  'checkIfLeaked',
] as const) {}

export class LoginResponseDto {
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
