import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional } from 'class-validator'

export class DeleteSelfDTO {
  @ApiProperty({
    example: 'I want to delete my account because ... and ...',
    required: false,
  })
  @IsOptional()
  @IsString()
  feedback: string
}
