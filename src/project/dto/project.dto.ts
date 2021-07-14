import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class ProjectDTO {
  @ApiProperty({
    example: 'Your awesome project',
    required: true,
    description: 'A display name for your project'
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'A unique project ID'
  })
  @IsNotEmpty()
  id: string

  @ApiProperty({
    example: 'localhost:3000,example.com',
    required: false,
    description: 'Coma-separated allowed origins'
  })
  origins: string
}
