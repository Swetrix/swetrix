import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { UserController } from './user.controller'
import { UserService } from './user.service'
import { User } from './entities/user.entity'
import { ActionTokensModule } from 'src/action-tokens/action-tokens.module'
import { MailerModule } from '../mailer/mailer.module'
import { AuthModule } from '../auth/auth.module'
import { AppLoggerModule } from '../logger/logger.module'
import { ProjectModule } from '../project/project.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ActionTokensModule,
    MailerModule,
    forwardRef(() => AuthModule),
    AppLoggerModule,
    ProjectModule,
  ],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
