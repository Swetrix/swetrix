import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { PendingInvitation } from './pending-invitation.entity'

@Injectable()
export class PendingInvitationService {
  constructor(
    @InjectRepository(PendingInvitation)
    private readonly repository: Repository<PendingInvitation>,
  ) {}

  async create(data: Partial<PendingInvitation>): Promise<PendingInvitation> {
    return this.repository.save(data)
  }

  async findById(id: string): Promise<PendingInvitation | null> {
    return this.repository.findOne({ where: { id } })
  }

  async findByEmail(email: string): Promise<PendingInvitation[]> {
    return this.repository.find({ where: { email } })
  }

  async findByEmailAndProject(
    email: string,
    projectId: string,
  ): Promise<PendingInvitation | null> {
    return this.repository.findOne({ where: { email, projectId } })
  }

  async findByEmailAndOrganisation(
    email: string,
    organisationId: string,
  ): Promise<PendingInvitation | null> {
    return this.repository.findOne({ where: { email, organisationId } })
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id)
  }

  async deleteAllByEmail(email: string): Promise<void> {
    await this.repository.delete({ email })
  }
}
