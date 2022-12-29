import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class PageviewsDTO {
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

  @ApiProperty({
    example: 'https://example.com',
    description: 'The referrer',
  })
  ref?: string

  @ApiProperty({
    example: 'duckduckgo',
    description: 'utm_source URL parameter',
  })
  so?: string

  @ApiProperty({
    example: 'cpc',
    description: 'utm_medium URL parameter',
  })
  me?: string

  @ApiProperty({
    example: 'spring_sale',
    description: 'utm_campaign URL parameter',
  })
  ca?: string

  @ApiProperty({
    example: false,
    description: 'If true, only unique events will be saved',
  })
  unique?: boolean

  @ApiProperty({
    example: {
      conn:0.5,
      dns: 0,
      dom_load: 975.4000000059605,
      page_load: 1515.8999999761581,
      render: 531.1999999880791,
      response: 0.5999999940395355,
      tls: 0,
      ttfb: 1.800000011920929,
    },
    description: 'Performance metrics',
  })
  perf?: {
    dns: number,
    tls: number,
    conn: number,
    response: number,
    render: number,
    dom_load: number,
    page_load: number,
    ttfb: number,
  }
}
