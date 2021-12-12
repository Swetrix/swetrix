import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { SelfhostedGuard } from '../common/guards/selfhosted.guard'

@ApiTags('Ping')
@Controller('ping')
export class PingController {
  constructor() {}

  @Get('/')
  @UseGuards(SelfhostedGuard)
  async get(): Promise<any> {
    return
  }
}
