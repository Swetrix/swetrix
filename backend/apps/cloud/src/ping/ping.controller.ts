import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Ping')
@Controller('ping')
export class PingController {
  @Get('/')
  get(): any {}
}
