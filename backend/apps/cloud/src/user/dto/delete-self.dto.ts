import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional, IsNotEmpty } from 'class-validator'

export class DeleteSelfDTO {
  @ApiProperty({
    example: 'hunter2',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  password: string

  @ApiProperty({
    example: 'I want to delete my account because ... and ...',
    required: false,
  })
  @IsOptional()
  @IsString()
  feedback: string
}
