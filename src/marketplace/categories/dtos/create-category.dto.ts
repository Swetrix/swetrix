import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateCategory {
  @ApiProperty({
    description: 'Category title',
    example: 'Marketing',
    maxLength: 255,
    minLength: 1,
    type: String,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  readonly title!: string

  @ApiProperty({
    default: null,
    description: 'Category description',
    example: 'Extensions for your marketing needs.',
    maxLength: 1024,
    minLength: 1,
    nullable: true,
    required: false,
    type: String,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(1024)
  readonly description?: string | null
}
