import { ApiProperty } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

export class VerifyEmailDto {
  @ApiProperty({
    description: 'The token to verify the email',
    example: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6',
  })
  @IsUUID('4', { message: 'validation.isUuid' })
  public readonly token: string
}
