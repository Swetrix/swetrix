import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class CreateFeedbackDTO {
  @ApiProperty({
    example: 'I would love to see...',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string
}
