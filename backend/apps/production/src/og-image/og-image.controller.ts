import { Controller, Query, Get, Header, Res } from '@nestjs/common'
import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger'
import { Response } from 'express'

import { OgImageService } from './og-image.service'
import { AppLoggerService } from '../logger/logger.service'

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
    @Res() res: Response,
  ): Promise<any> {
    this.logger.log({ title }, 'GET /og-image')

    const image = await this.ogImageService.getOgImage(title)

    res.end(image)
  }
}
