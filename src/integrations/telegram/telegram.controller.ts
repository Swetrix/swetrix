import {
  Controller,
  Logger,
  Post,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common'

@Controller({ path: 'telegram', version: '1' })
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name)

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleTelegramWebhook(@Req() request: Request) {
    this.logger.log(request.body)
    return 'OK'
  }
}
