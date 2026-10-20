import { OmitType, ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator'
import { EventsDto } from './events.dto'

export class OutboundDto extends OmitType(EventsDto, [
  'ev',
  'unique',
] as const) {
  @ApiProperty({ description: 'Outbound destination URL', maxLength: 2048 })
  @IsString()
  @MaxLength(2048)
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
    disallow_auth: true,
  })
  url: string

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  title?: string | null
}
