import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsDateString, Length } from 'class-validator'

export class AnnotationCreateDTO {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'Project ID',
  })
  @IsNotEmpty()
  pid: string

  @ApiProperty({
    example: '2025-01-15',
    required: true,
    description: 'Date of the annotation (YYYY-MM-DD)',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string

  @ApiProperty({
    example: 'Started Facebook ad campaign',
    required: true,
    description: 'Annotation text (max 120 characters)',
  })
  @IsNotEmpty()
  @Length(1, 120)
  text: string
}
