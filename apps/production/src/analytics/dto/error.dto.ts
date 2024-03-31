import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class ErrorDTO {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  pid: string

  // Tracking metrics
  @ApiProperty({
    example: 'Europe/Kiev',
    description: "User's timezone",
  })
  tz?: string

  @ApiProperty({
    example: '/articles/my-awesome-article-1',
    description: 'A page that user sent data from',
  })
  pg?: string

  @ApiProperty({
    example: 'en-GB',
    description: "User's locale",
  })
  lc?: string

  // Error metrics
  @ApiProperty({
    example: 'ParseError',
    required: true,
    maxLength: 200,
  })
  @IsNotEmpty()
  name: string

  @ApiProperty({
    example: 'Malformed input',
    maxLength: 2000,
  })
  message?: string

  @ApiProperty({
    example: 12,
  })
  lineno?: number

  @ApiProperty({
    example: 510,
  })
  colno?: number

  @ApiProperty({
    example: 'https://example.com/assets/convert.js',
    maxLength: 1000,
  })
  filename?: string
}
