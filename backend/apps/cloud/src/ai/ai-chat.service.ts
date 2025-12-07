import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, FindManyOptions, FindOneOptions } from 'typeorm'
import { AiChat, ChatMessage } from './entity/ai-chat.entity'

@Injectable()
export class AiChatService {
  constructor(
    @InjectRepository(AiChat)
    private aiChatRepository: Repository<AiChat>,
  ) {}

  async findOne(options: FindOneOptions<AiChat>): Promise<AiChat | null> {
    return this.aiChatRepository.findOne(options)
  }

  async find(options: FindManyOptions<AiChat>): Promise<AiChat[]> {
    return this.aiChatRepository.find(options)
  }

  async findRecentByProject(
    projectId: string,
    userId: string | null,
    limit: number = 5,
  ): Promise<AiChat[]> {
    const queryBuilder = this.aiChatRepository
      .createQueryBuilder('chat')
      .where('chat.projectId = :projectId', { projectId })
      .orderBy('chat.updated', 'DESC')
      .take(limit)

    if (userId) {
      queryBuilder.andWhere('(chat.userId = :userId OR chat.userId IS NULL)', {
        userId,
      })
    }

    return queryBuilder.getMany()
  }

  async findAllByProject(
    projectId: string,
    userId: string | null,
    skip: number = 0,
    take: number = 20,
  ): Promise<{ chats: AiChat[]; total: number }> {
    const queryBuilder = this.aiChatRepository
      .createQueryBuilder('chat')
      .where('chat.projectId = :projectId', { projectId })
      .orderBy('chat.updated', 'DESC')
      .skip(skip)
      .take(take)

    if (userId) {
      queryBuilder.andWhere('(chat.userId = :userId OR chat.userId IS NULL)', {
        userId,
      })
    }

    const [chats, total] = await queryBuilder.getManyAndCount()
    return { chats, total }
  }

  async create(data: {
    projectId: string
    userId: string | null
    messages: ChatMessage[]
    name?: string
  }): Promise<AiChat> {
    const chat = this.aiChatRepository.create({
      project: { id: data.projectId },
      user: data.userId ? { id: data.userId } : null,
      messages: data.messages,
      name: data.name || this.generateChatName(data.messages),
    })
    return this.aiChatRepository.save(chat)
  }

  async update(
    id: string,
    data: { messages?: ChatMessage[]; name?: string },
  ): Promise<AiChat | null> {
    const chat = await this.aiChatRepository.findOne({ where: { id } })
    if (!chat) return null

    if (data.messages) {
      chat.messages = data.messages
      // Update name if not manually set and we have a new first user message
      if (!chat.name || chat.name === this.generateChatName(chat.messages)) {
        chat.name = this.generateChatName(data.messages)
      }
    }
    if (data.name !== undefined) {
      chat.name = data.name
    }

    return this.aiChatRepository.save(chat)
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.aiChatRepository.delete(id)
    return (result.affected ?? 0) > 0
  }

  private generateChatName(messages: ChatMessage[]): string {
    // Use the first user message as the chat name
    const firstUserMessage = messages.find(m => m.role === 'user')
    if (firstUserMessage) {
      const content = firstUserMessage.content.trim()
      // Truncate to reasonable length
      return content.length > 100 ? content.slice(0, 97) + '...' : content
    }
    return 'New conversation'
  }

  async verifyAccess(
    chatId: string,
    projectId: string,
    userId: string | null,
  ): Promise<AiChat | null> {
    const queryBuilder = this.aiChatRepository
      .createQueryBuilder('chat')
      .where('chat.id = :chatId', { chatId })
      .andWhere('chat.projectId = :projectId', { projectId })

    if (userId) {
      queryBuilder.andWhere('(chat.userId = :userId OR chat.userId IS NULL)', {
        userId,
      })
    }

    return queryBuilder.getOne()
  }
}
