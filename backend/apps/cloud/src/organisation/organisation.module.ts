import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Organisation } from './entity/organisation.entity'
import { OrganisationMember } from './entity/organisation-member.entity'
import { OrganisationController } from './organisation.controller'
import { OrganisationService } from './organisation.service'
import { UserModule } from '../user/user.module'
import { MailerModule } from '../mailer/mailer.module'
import { ActionTokensModule } from '../action-tokens/action-tokens.module'
import { AppLoggerModule } from '../logger/logger.module'
import { ProjectModule } from '../project/project.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Organisation, OrganisationMember]),
    forwardRef(() => UserModule),
    forwardRef(() => ProjectModule),
    MailerModule,
    ActionTokensModule,
    AppLoggerModule,
  ],
  controllers: [OrganisationController],
  providers: [OrganisationService],
  exports: [OrganisationService],
})
export class OrganisationModule {}
