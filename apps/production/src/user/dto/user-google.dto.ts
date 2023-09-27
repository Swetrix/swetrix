import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsEmail, IsString } from 'class-validator'

export class UserGoogleDTO {
  @ApiProperty({ example: '10769150350006150715113082367', required: true })
  @IsString()
  googleId: string

  @ApiProperty({ required: true })
  @IsBoolean()
  registeredWithGoogle: boolean

  @ApiProperty({ example: '2023-01-01 23:12:55', required: true })
  @IsString()
  trialEndDate: string

  @ApiProperty({ example: 'hello@example.com', required: false })
  @IsEmail()
  email?: string

  @ApiProperty({ example: 1, required: false })
  emailRequests: number

  @ApiProperty({ example: true, required: false })
  isActive: boolean

  @ApiProperty({ example: 'uuid-of-referrer', required: false })
  referrerId?: string
}
