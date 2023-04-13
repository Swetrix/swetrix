import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class AuthUserGoogleDto {
  @ApiProperty({
    description: 'Google auth token',
    example: 'ya29.a0 ...',
  })
  @IsNotEmpty()
  @IsString()
  token: string
}
