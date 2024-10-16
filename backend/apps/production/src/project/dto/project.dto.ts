import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, Length, IsEnum, IsOptional } from 'class-validator'
import { BotsProtectionLevel } from '../entity/project.entity'

export class ProjectDTO {
  @ApiProperty({
    example: 'Your awesome project',
    required: true,
    description: 'A display name for your project',
  })
  @IsNotEmpty()
  @Length(1, 50)
  name: string

  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'A unique project ID',
  })
  @IsNotEmpty()
  id: string

  @ApiProperty({
    example: 'localhost:3000,example.com',
    required: false,
    description: 'An array allowed origins',
  })
  origins: string[] | null

  @ApiProperty({
    enum: BotsProtectionLevel,
    required: false,
    description: 'Bots protection level',
  })
  @IsEnum(BotsProtectionLevel)
  @IsOptional()
  botsProtectionLevel?: BotsProtectionLevel

  @ApiProperty({
    example: '::1,127.0.0.1,192.168.0.1/32',
    required: false,
    description: 'Array of blocked IP addresses',
  })
  ipBlacklist: string[] | null

  @ApiProperty({
    required: false,
    description:
      "The project's state. If enabled - all the incoming analytics data will be saved.",
  })
  active: boolean

  @ApiProperty({
    required: false,
    description:
      "When true, anyone on the internet (including Google) would be able to see the project's Dashboard.",
  })
  public: boolean

  @ApiProperty({
    required: false,
    description:
      'When true, created a new Captcha Project without Analytics Projects.',
  })
  isCaptcha: boolean
}
