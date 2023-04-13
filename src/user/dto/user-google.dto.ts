import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString } from 'class-validator'

export class UserGoogleDTO {
  @ApiProperty({ example: '10769150350006150715113082367', required: true })
  @IsEmail()
  googleId: string

  @ApiProperty({ example: '2023-01-01 23:12:55', required: true })
  @IsString()
  trialEndDate: string
}
