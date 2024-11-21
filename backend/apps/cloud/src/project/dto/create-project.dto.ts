import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, Length } from 'class-validator'

export class CreateProjectDTO {
  @ApiProperty({
    example: 'Your awesome project',
    required: true,
    description: 'A display name for your project',
  })
  @IsNotEmpty()
  @Length(1, 50)
  name: string

  @ApiProperty({
    required: false,
  })
  isCaptcha?: boolean

  @ApiProperty({
    required: false,
  })
  public?: boolean

  @ApiProperty({
    required: false,
  })
  active?: boolean

  @ApiProperty({
    required: false,
  })
  isPasswordProtected?: boolean

  @ApiProperty({
    required: false,
  })
  password?: string

  @ApiProperty({
    required: false,
  })
  origins?: string[]

  @ApiProperty({
    required: false,
  })
  ipBlacklist?: string[]
}
