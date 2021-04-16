import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class PageviewsDTO {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID'
  })
  @IsNotEmpty()
  pid: string

  @ApiProperty({
    example: 'pageviews',
    description: 'Event type'
  })
  ev: string

  // Tracking metrics
  @ApiProperty({
    example: 'UTC+2',
    description: 'User\'s timezone'
  })
  tz: string

  @ApiProperty({
    example: '/articles/my-awesome-article-1',
    description: 'A page that user sent data from'
  })
  pg: string

  @ApiProperty({
    example: 'en-GB',
    description: 'User\'s locale'
  })
  lc: string

  @ApiProperty({
    example: 'https://example.com',
    description: 'The referrer'
  })
  ref: string

  @ApiProperty({
    example: 1920,
    description: 'Screen width'
  })
  sw: number

  @ApiProperty({
    example: 'duckduckgo',
    description: 'utm_source URL parameter'
  })
  so: string

  @ApiProperty({
    example: 'cpc',
    description: 'utm_medium URL parameter'
  })
  me: string

  @ApiProperty({
    example: 'spring_sale',
    description: 'utm_campaign URL parameter'
  })
  ca: string

  // Performance metrics
  @ApiProperty({
    example: 261,
    description: 'Page load time (in milliseconds)'
  })
  lt: number
}