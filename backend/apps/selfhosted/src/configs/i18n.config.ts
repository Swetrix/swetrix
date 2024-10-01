import { join } from 'path'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AcceptLanguageResolver, I18nAsyncOptions } from 'nestjs-i18n'

export const getI18nConfig = (): I18nAsyncOptions => ({
  imports: [ConfigModule],
  inject: [ConfigService],
  resolvers: [AcceptLanguageResolver],
  useFactory: (configService: ConfigService) => ({
    fallbackLanguage: 'en',
    loaderOptions: {
      path: join(__dirname, '..', 'i18n'),
      watch: configService.get('NODE_ENV') === 'development',
    },
  }),
})
