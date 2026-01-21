import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Ip,
  Query,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import net from 'net'

import { ToolsService } from './tools.service'
import { IpLookupQueryDto, IpLookupResponseDto } from './dto/ip-lookup.dto'
import { getIPFromHeaders, checkRateLimit } from '../common/utils'
import { trackCustom } from '../common/analytics'
import { Public } from '../auth/decorators'

const IP_LOOKUP_RL_REQUESTS = 30
const IP_LOOKUP_RL_TIMEOUT = 60 // 1 minute

@ApiTags('Tools')
@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get('ip-lookup')
  @Public()
  @ApiOperation({
    summary: 'Look up geolocation information for an IP address',
    description:
      'Returns detailed geolocation data including country, city, region, coordinates, timezone, and more. If no IP is provided, uses the IP of the requester.',
  })
  @ApiResponse({
    status: 200,
    description: 'IP geolocation data',
    type: IpLookupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid IP address provided',
  })
  async lookupIP(
    @Query() query: IpLookupQueryDto,
    @Headers() headers: unknown,
    @Ip() reqIP: string,
  ): Promise<IpLookupResponseDto> {
    const clientIp = getIPFromHeaders(headers) || reqIP || ''
    const userAgent =
      typeof headers === 'object' && headers !== null
        ? (headers as Record<string, string>)['user-agent'] || ''
        : ''

    await checkRateLimit(
      clientIp,
      'ip-lookup',
      IP_LOOKUP_RL_REQUESTS,
      IP_LOOKUP_RL_TIMEOUT,
    )

    let ip = query.ip || ''

    // Normalise IPv6 localhost
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      ip = '127.0.0.1'
    }

    // Validate IP format
    if (!ip || !net.isIP(ip)) {
      throw new BadRequestException('Please enter a valid IP address')
    }

    const result = this.toolsService.lookupIP(ip)

    trackCustom(clientIp, userAgent, {
      ev: 'IP_LOOKUP',
      meta: {
        ipVersion: String(result.ipVersion),
      },
    })

    return result
  }
}
