import { ApiProperty } from '@nestjs/swagger'

export class LoginRequestDto {
  email: string
  password: string
}

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
