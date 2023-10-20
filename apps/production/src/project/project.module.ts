import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ProjectService } from './project.service'
import { ProjectController } from './project.controller'
import { UserModule } from '../user/user.module'
import { ActionTokensModule } from '../action-tokens/action-tokens.module'
import { MailerModule } from '../mailer/mailer.module'
import { AppLoggerModule } from '../logger/logger.module'
import { Project, ProjectSubscriber, Funnel, ProjectShare } from './entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectShare,
      ProjectSubscriber,
      Funnel,
    ]),
    forwardRef(() => UserModule),
    AppLoggerModule,
    ActionTokensModule,
    MailerModule,
  ],
  providers: [ProjectService],
  exports: [ProjectService],
  controllers: [ProjectController],
})
export class ProjectModule {}
