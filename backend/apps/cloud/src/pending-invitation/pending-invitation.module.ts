import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PendingInvitation } from './pending-invitation.entity'
import { PendingInvitationService } from './pending-invitation.service'

@Module({
  imports: [TypeOrmModule.forFeature([PendingInvitation])],
  providers: [PendingInvitationService],
  exports: [PendingInvitationService],
})
export class PendingInvitationModule {}
