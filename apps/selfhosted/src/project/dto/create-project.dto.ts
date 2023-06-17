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
}
