import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CdnService } from './cdn.service'

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get('CDN_URL'),
      }),
    }),
  ],
  providers: [CdnService],
  exports: [CdnService],
})
export class CdnModule {}
