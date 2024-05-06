import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator'
import { PID_REGEX } from '../../common/constants'

export class ErrorDTO {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, {
    message: 'Incorrect project ID format.',
  })
  pid: string

  // Tracking metrics
  @ApiProperty({
    example: 'Europe/Kiev',
    description: "User's timezone",
  })
  @IsOptional()
  @IsString()
  tz?: string

  @ApiProperty({
    example: '/articles/my-awesome-article-1',
    description: 'A page that user sent data from',
  })
  @IsOptional()
  @IsString()
  pg?: string

  @ApiProperty({
    example: 'en-GB',
    description: "User's locale",
  })
  @IsOptional()
  @IsString()
  lc?: string

  // Error metrics
  @ApiProperty({
    example: 'ParseError',
    required: true,
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string

  @ApiProperty({
    example: 'Malformed input',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string

  @ApiProperty({
    example: 12,
  })
  @IsOptional()
  @IsNumber()
  lineno?: number

  @ApiProperty({
    example: 510,
  })
  @IsOptional()
  @IsNumber()
  colno?: number

  @ApiProperty({
    example: 'https://example.com/assets/convert.js',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  filename?: string
}
