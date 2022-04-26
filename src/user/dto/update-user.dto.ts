import { ApiProperty } from '@nestjs/swagger'
import { IsEmail } from 'class-validator'

export class UpdateUserProfileDTO {
  @ApiProperty({ example: 'you@example.com', required: true })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'your_password123' })
  password: string

  @ApiProperty({ example: true })
  isActive: boolean

  @ApiProperty({ example: 'free' })
  planCode: string

  @ApiProperty({ example: 'customer' })
  roles: Array<string>

  @ApiProperty({ example: 'date' })
  created: string

  @ApiProperty({ example: 'Number' })
  emailRequests: number

  @ApiProperty({ example: 'reportFrequency' })
  reportFrequency: string

  @ApiProperty({ example: 'updated' })
  updated: string
}
