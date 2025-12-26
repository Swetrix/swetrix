import {
  Controller,
  Query,
  Get,
  Header,
  Res,
  BadRequestException,
  Headers,
  Ip,
} from '@nestjs/common'
import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger'
import { Response } from 'express'

import { OgImageService } from './og-image.service'
import { AppLoggerService } from '../logger/logger.service'
import { checkRateLimit, getIPFromHeaders } from '../common/utils'

@ApiTags('Opengraph Image Generator')
@Controller(['v1/og-image'])
export class OgImageController {
  constructor(
    private readonly ogImageService: OgImageService,

    private readonly logger: AppLoggerService,
  ) {}

  @Get()
  @ApiQuery({ name: 'title', required: true })
  @Header('Content-Type', 'image/jpeg')
  // 2 weeks cache
  @Header(
    'Cache-Control',
    'immutable, no-transform, s-max-age=1210000, max-age=1210000',
  )
  @ApiResponse({ status: 200 })
  async getShared(
    @Query('title') title: string,
    @Headers() headers: Record<string, string>,
    @Ip() requestIp: string,
    @Res() res: Response,
  ): Promise<any> {
    if (!title || typeof title !== 'string') {
      throw new BadRequestException('Title is required')
    }

    // Prevent abusive query sizes (also avoids logging/rendering huge values).
    if (title.length > 2048) {
      throw new BadRequestException('Title is too long')
    }

    const ip = getIPFromHeaders(headers) || requestIp || ''
    await checkRateLimit(ip, 'og-image', 100, 60 * 60)

    this.logger.log({ titleLength: title.length }, 'GET /og-image')

    const image = await this.ogImageService.getOgImage(title)

    res.end(image)
  }
}
