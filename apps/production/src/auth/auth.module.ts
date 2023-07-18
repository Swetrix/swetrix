import { forwardRef, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ActionTokensModule } from 'src/action-tokens/action-tokens.module'
import { MailerModule } from 'src/mailer/mailer.module'
import { UserModule } from 'src/user/user.module'
import { ProjectModule } from 'src/project/project.module'
import { TelegramService } from 'src/integrations/telegram/telegram.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import {
  ApiKeyStrategy,
  JwtAccessTokenStrategy,
  JwtRefreshTokenStrategy,
} from './strategies'
import { Message } from '../integrations/telegram/entities/message.entity'

@Module({
  imports: [
    JwtModule.register({}),
    PassportModule,
    forwardRef(() => UserModule),
    ActionTokensModule,
    MailerModule,
    ActionTokensModule,
    ProjectModule,
    TypeOrmModule.forFeature([Message]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessTokenStrategy,
    JwtRefreshTokenStrategy,
    ApiKeyStrategy,
    TelegramService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
