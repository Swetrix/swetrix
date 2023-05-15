import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateCategory {
  @ApiProperty({
    description: 'Category name',
    example: 'Marketing',
    maxLength: 255,
    minLength: 1,
    required: false,
    type: String,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  readonly name?: string
}
