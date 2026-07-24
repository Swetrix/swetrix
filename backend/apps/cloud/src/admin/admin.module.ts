import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Organisation } from '../organisation/entity/organisation.entity'
import { OrganisationMember } from '../organisation/entity/organisation-member.entity'
import { Project } from '../project/entity/project.entity'
import { CancellationFeedback } from '../user/entities/cancellation-feedback.entity'
import { DeleteFeedback } from '../user/entities/delete-feedback.entity'
import { User } from '../user/entities/user.entity'
import { UserFeedback } from '../user/entities/user-feedback.entity'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Project,
      Organisation,
      OrganisationMember,
      UserFeedback,
      DeleteFeedback,
      CancellationFeedback,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
