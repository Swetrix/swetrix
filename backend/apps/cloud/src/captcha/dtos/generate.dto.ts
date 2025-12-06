import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class GenerateDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'A unique project ID',
  })
  @IsNotEmpty()
  @IsString()
  pid: string
}
