import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateCategory {
  @ApiProperty({
    description: 'Category name',
    example: 'Marketing',
    maxLength: 255,
    minLength: 1,
    type: String,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  readonly name!: string
}
