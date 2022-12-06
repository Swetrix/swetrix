import { ApiProperty } from '@nestjs/swagger'
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

export class UpdateExtension {
  @ApiProperty({
    description: 'Extension name',
    example: '', // TODO: Add example
    maxLength: 255,
    minLength: 1,
    type: String,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  readonly name!: string

  @ApiProperty({
    default: null,
    description: 'Extension description',
    example: '', // Add example
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

  @ApiProperty({
    default: 'patch',
    description: 'Extension version',
    example: 'major',
    enum: ['major', 'minor', 'patch'],
    required: false,
    type: String,
  })
  @IsString()
  @IsOptional()
  @Matches(/^(major|minor|patch)$/)
  readonly version?: string

  @ApiProperty({
    default: 0,
    description: 'Extension price',
    example: 100,
    required: false,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  readonly price?: number

  @ApiProperty({
    default: [],
    description: 'Extension category ID',
    example: 1,
    required: false,
    type: Array<number>,
  })
  @IsOptional()
  readonly categoryID?: number

  @ApiProperty({
    default: [],
    description: 'Extension additional images',
    example: [
      'https://example.com/image1.png',
      'https://example.com/image2.png',
    ],
    required: false,
    type: Array<string>,
  })
  @IsOptional()
  readonly additionalImagesCdn?: string[]
}
