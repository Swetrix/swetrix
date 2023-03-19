import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class ManualDTO {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'A unique project ID',
  })
  @IsNotEmpty()
  @IsString()
  pid: string

  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  hash: string

  @ApiProperty({
    required: true,
    example: '4vic2',
    description: 'Captcha code',
  })
  @IsNotEmpty()
  @IsString()
  code: string
}
