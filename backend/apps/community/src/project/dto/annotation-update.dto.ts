import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsDateString, Length, IsOptional } from 'class-validator'

export class AnnotationUpdateDTO {
  @ApiProperty({
    example: 'uuid-annotation-id',
    required: true,
    description: 'Annotation ID',
  })
  @IsNotEmpty()
  id: string

  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'Project ID',
  })
  @IsNotEmpty()
  pid: string

  @ApiProperty({
    example: '2025-01-15',
    required: false,
    description: 'Date of the annotation (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  date?: string

  @ApiProperty({
    example: 'Updated annotation text',
    required: false,
    description: 'Annotation text (max 120 characters)',
  })
  @IsOptional()
  @Length(1, 120)
  text?: string
}
