import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class IpLookupQueryDto {
  @ApiPropertyOptional({
    description: 'IP address to look up. If not provided, uses the request IP.',
    example: '8.8.8.8',
  })
  @IsOptional()
  @IsString()
  ip?: string
}

export class IpLookupResponseDto {
  @ApiProperty({ description: 'The IP address that was looked up' })
  ip: string

  @ApiPropertyOptional({ description: 'Country ISO-3166 alpha-2 code' })
  country: string | null

  @ApiPropertyOptional({ description: 'Country name' })
  countryName: string | null

  @ApiPropertyOptional({ description: 'City name' })
  city: string | null

  @ApiPropertyOptional({ description: 'State/Province/Region name' })
  region: string | null

  @ApiPropertyOptional({ description: 'State/Province ISO-3166-2 code' })
  regionCode: string | null

  @ApiPropertyOptional({ description: 'Continent code' })
  continentCode: string | null

  @ApiPropertyOptional({ description: 'Continent name' })
  continentName: string | null

  @ApiPropertyOptional({ description: 'Postal/ZIP code' })
  postalCode: string | null

  @ApiPropertyOptional({ description: 'Latitude coordinate' })
  latitude: number | null

  @ApiPropertyOptional({ description: 'Longitude coordinate' })
  longitude: number | null

  @ApiPropertyOptional({ description: 'Timezone (IANA format)' })
  timezone: string | null

  @ApiPropertyOptional({ description: 'Whether the country is in the EU' })
  isInEuropeanUnion: boolean

  @ApiPropertyOptional({ description: 'IP version (4 or 6)' })
  ipVersion: 4 | 6
}
