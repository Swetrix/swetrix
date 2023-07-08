import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { TelegramService } from '../integrations/telegram/telegram.service'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { User } from './entities/user.entity'
import { ActionTokensModule } from '../action-tokens/action-tokens.module'
import { MailerModule } from '../mailer/mailer.module'
import { AuthModule } from '../auth/auth.module'
import { AppLoggerModule } from '../logger/logger.module'
import { ProjectModule } from '../project/project.module'
import { RefreshToken } from './entities/refresh-token.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    ActionTokensModule,
    MailerModule,
    forwardRef(() => AuthModule),
    AppLoggerModule,
    ProjectModule,
  ],
  providers: [UserService, TelegramService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
