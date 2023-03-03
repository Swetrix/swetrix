import {
  Controller, Post, Body, UseGuards, ForbiddenException, InternalServerErrorException, Headers, Ip, Request, Req,
} from '@nestjs/common'
import { CaptchaService } from './captcha.service'
import { BotDetectionGuard } from '../common/guards/bot-detection.guard'
import { BotDetection } from '../common/decorators/bot-detection.decorator'

@Controller({
  version: '1',
  path: 'captcha',
})
export class CaptchaController {
  constructor(
    private readonly captchaService: CaptchaService,
  ) { }


  @Post('/auto-verify')
  @UseGuards(BotDetectionGuard)
  @BotDetection()
  async logCustom(
    @Body() eventsDTO: EventsDTO,
    @Headers() headers,
    @Req() request: Request
    @Ip() reqIP,
  ): Promise<any> {
    // request.cookies['cookieKey']
    const { 'user-agent': userAgent, origin } = headers

    const ip = headers['cf-connecting-ip'] || headers['x-forwarded-for'] || reqIP || ''

    // await this.analyticsService.validate(eventsDTO, origin, 'custom', ip)
  }
}
