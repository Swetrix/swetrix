import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsEmail, IsString } from 'class-validator'

export class UserGithubDTO {
  @ApiProperty({ example: 12345, required: true })
  @IsString()
  githubId: number

  @ApiProperty({ required: true })
  @IsBoolean()
  registeredWithGithub: boolean

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
