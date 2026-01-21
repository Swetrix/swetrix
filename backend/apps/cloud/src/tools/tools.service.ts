import { Injectable } from '@nestjs/common'
import net from 'net'
import { IpLookupResponseDto } from './dto/ip-lookup.dto'
import { getExtendedGeoDetails } from '../common/utils'

const EU_COUNTRIES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
])

@Injectable()
export class ToolsService {
  lookupIP(ip: string): IpLookupResponseDto {
    const ipVersion = net.isIPv4(ip) ? 4 : net.isIPv6(ip) ? 6 : 4
    const geo = getExtendedGeoDetails(ip)

    return {
      ip,
      country: geo.country,
      countryName: geo.countryName,
      city: geo.city,
      region: geo.region,
      regionCode: geo.regionCode,
      continentCode: geo.continentCode,
      continentName: geo.continentName,
      postalCode: geo.postalCode,
      latitude: geo.latitude,
      longitude: geo.longitude,
      timezone: geo.timezone,
      isInEuropeanUnion: geo.country ? EU_COUNTRIES.has(geo.country) : false,
      ipVersion,
    }
  }
}
