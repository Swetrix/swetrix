import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ProjectService } from './project.service'
import { ProjectController } from './project.controller'
import { GSCController } from './gsc.controller'
import { GSCService } from './gsc.service'
import { UserModule } from '../user/user.module'
import { ActionTokensModule } from '../action-tokens/action-tokens.module'
import { MailerModule } from '../mailer/mailer.module'
import { AppLoggerModule } from '../logger/logger.module'
import { Project, ProjectSubscriber, Funnel, ProjectShare } from './entity'
import { ProjectsViewsRepository } from './repositories/projects-views.repository'
import { ProjectViewEntity } from './entity/project-view.entity'
import { ProjectViewCustomEventEntity } from './entity/project-view-custom-event.entity'
import { OrganisationModule } from '../organisation/organisation.module'
import { ProjectExtraService } from './project-extra.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectShare,
      ProjectSubscriber,
      Funnel,
      ProjectViewEntity,
      ProjectViewCustomEventEntity,
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => OrganisationModule),
    AppLoggerModule,
    ActionTokensModule,
    MailerModule,
  ],
  providers: [
    ProjectService,
    ProjectExtraService,
    ProjectsViewsRepository,
    GSCService,
  ],
  exports: [
    ProjectService,
    ProjectExtraService,
    ProjectsViewsRepository,
    GSCService,
  ],
  controllers: [ProjectController, GSCController],
})
export class ProjectModule {}
