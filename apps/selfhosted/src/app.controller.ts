import { Get, Controller, OnApplicationShutdown } from '@nestjs/common'
import { clickhouse } from './common/integrations/clickhouse'

const DEPLOYMENT_INFORMATION = {
  name: 'Swetrix API',
  repository: 'https://github.com/swetrix/swetrix-api',
  documentation: 'https://docs.swetrix.com',
  homepage: 'https://swetrix.com',
}

@Controller()
export class AppController implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await clickhouse.close()
  }

  @Get()
  root(): any {
    return DEPLOYMENT_INFORMATION
  }
}
