import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { ActionToken, ActionTokenType } from './action-token.entity'
import { User } from '../user/entities/user.entity'

@Injectable()
export class ActionTokensService {
  constructor(
    @InjectRepository(ActionToken)
    private actionTokensRepository: Repository<ActionToken>,
  ) {}

  async deleteMultiple(where: string): Promise<any> {
    return this.actionTokensRepository
      .createQueryBuilder()
      .delete()
      .where(where)
      .execute()
  }

  async createForUser(
    user: User,
    action: ActionTokenType,
    newValue: string = null,
  ) {
    return this.actionTokensRepository.save({ user, action, newValue })
  }

  async find(id: string) {
    return this.actionTokensRepository.findOneOrFail({
      where: { id },
      relations: ['user'],
    })
  }

  async delete(id: string) {
    await this.actionTokensRepository.delete(id)
  }

  async createActionToken(
    userId: string,
    action: ActionTokenType,
    newValue?: string,
  ) {
    return this.actionTokensRepository.save({
      user: { id: userId },
      action,
      newValue,
    })
  }

  async findActionToken(token: string) {
    return this.actionTokensRepository.findOne({
      where: { id: token },
      relations: ['user'],
    })
  }

  async deleteActionToken(token: string) {
    await this.actionTokensRepository.delete(token)
  }

  async getActionToken(token: string) {
    return this.actionTokensRepository.findOne({
      where: {
        id: token,
      },
      relations: ['user'],
    })
  }
}
