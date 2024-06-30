import { Get, Controller } from '@nestjs/common'

const DEPLOYMENT_INFORMATION = {
  name: 'Swetrix API',
  repository: 'https://github.com/swetrix/swetrix-api',
  documentation: 'https://docs.swetrix.com',
  homepage: 'https://swetrix.com',
}

@Controller()
export class AppController {
  @Get()
  root(): any {
    return DEPLOYMENT_INFORMATION
  }
}
