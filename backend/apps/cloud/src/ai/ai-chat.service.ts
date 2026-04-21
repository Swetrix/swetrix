import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, FindManyOptions, FindOneOptions } from 'typeorm'
import { AiChat, ChatMessage } from './entity/ai-chat.entity'
import { MAX_TAGS_PER_CHAT, MAX_TAG_LENGTH } from './dto/chat.dto'

interface ListChatsOptions {
  search?: string
  tag?: string
  pinned?: boolean
  skip?: number
  take?: number
}

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
    if (!userId) {
      return []
    }

    const queryBuilder = this.aiChatRepository
      .createQueryBuilder('chat')
      .where('chat.projectId = :projectId', { projectId })
      .andWhere('chat.userId = :userId', { userId })
      .orderBy('chat.pinned', 'DESC')
      .addOrderBy('chat.updated', 'DESC')
      .take(limit)

    return queryBuilder.getMany()
  }

  async listByProject(
    projectId: string,
    userId: string | null,
    options: ListChatsOptions = {},
  ): Promise<{ chats: AiChat[]; total: number }> {
    if (!userId) {
      return { chats: [], total: 0 }
    }

    const { search, tag, pinned, skip = 0, take = 20 } = options

    const baseQuery = () =>
      this.aiChatRepository
        .createQueryBuilder('chat')
        .where('chat.projectId = :projectId', { projectId })
        .andWhere('chat.userId = :userId', { userId })

    const applyTagAndPinned = (qb: ReturnType<typeof baseQuery>) => {
      if (typeof pinned === 'boolean') {
        qb.andWhere('chat.pinned = :pinned', { pinned })
      }
      if (tag) {
        // simple-array stores tags as a comma-separated string
        qb.andWhere('(FIND_IN_SET(:tag, chat.tags) > 0 OR chat.tags = :tag)', {
          tag,
        })
      }
      return qb
    }

    const orderAndPaginate = (qb: ReturnType<typeof baseQuery>) =>
      qb
        .orderBy('chat.pinned', 'DESC')
        .addOrderBy('chat.updated', 'DESC')
        .skip(skip)
        .take(take)

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`

      const nameQb = applyTagAndPinned(baseQuery()).andWhere(
        'chat.name LIKE :term',
        { term },
      )

      const [nameChats, nameTotal] =
        await orderAndPaginate(nameQb).getManyAndCount()

      if (nameTotal > 0) {
        return { chats: nameChats, total: nameTotal }
      }

      // Fallback to content search across messages JSON
      const contentQb = applyTagAndPinned(baseQuery()).andWhere(
        'CAST(chat.messages AS CHAR) LIKE :term',
        { term },
      )

      const [contentChats, contentTotal] =
        await orderAndPaginate(contentQb).getManyAndCount()
      return { chats: contentChats, total: contentTotal }
    }

    const qb = orderAndPaginate(applyTagAndPinned(baseQuery()))
    const [chats, total] = await qb.getManyAndCount()
    return { chats, total }
  }

  /**
   * @deprecated Use {@link listByProject} instead.
   */
  async findAllByProject(
    projectId: string,
    userId: string | null,
    skip: number = 0,
    take: number = 20,
  ): Promise<{ chats: AiChat[]; total: number }> {
    return this.listByProject(projectId, userId, { skip, take })
  }

  async listTagsByProject(
    projectId: string,
    userId: string | null,
  ): Promise<string[]> {
    if (!userId) return []

    const rows = await this.aiChatRepository
      .createQueryBuilder('chat')
      .select('chat.tags', 'tags')
      .where('chat.projectId = :projectId', { projectId })
      .andWhere('chat.userId = :userId', { userId })
      .andWhere('chat.tags IS NOT NULL')
      .andWhere("chat.tags <> ''")
      .getRawMany<{ tags: string | null }>()

    // Dedupe case-insensitively while preserving the first-seen casing
    const map = new Map<string, string>()
    for (const row of rows) {
      if (!row.tags) continue
      // simple-array is comma-separated
      const parts = String(row.tags)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      for (const part of parts) {
        const key = part.toLowerCase()
        if (!map.has(key)) map.set(key, part)
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    )
  }

  async create(data: {
    projectId: string
    userId: string | null
    messages: ChatMessage[]
    name?: string
    parentChatId?: string | null
  }): Promise<AiChat> {
    const chat = this.aiChatRepository.create({
      project: { id: data.projectId },
      user: data.userId ? { id: data.userId } : null,
      messages: data.messages,
      name: data.name || this.generateChatName(data.messages),
      parentChatId: data.parentChatId ?? null,
    })
    return this.aiChatRepository.save(chat)
  }

  async findParentSummary(
    parentChatId: string,
    projectId: string,
  ): Promise<{ id: string; name: string | null } | null> {
    const parent = await this.aiChatRepository
      .createQueryBuilder('chat')
      .select(['chat.id', 'chat.name'])
      .where('chat.id = :parentChatId', { parentChatId })
      .andWhere('chat.projectId = :projectId', { projectId })
      .getOne()
    if (!parent) return null
    return { id: parent.id, name: parent.name }
  }

  /**
   * Atomically updates the chat name only when the current value still matches
   * `expectedName`. Used by background title generation so it can't clobber a
   * user-provided rename that happened concurrently. Returns true if the row
   * was actually updated.
   */
  async updateIfNameEquals(
    id: string,
    expectedName: string | null | undefined,
    data: { name: string },
  ): Promise<boolean> {
    const qb = this.aiChatRepository
      .createQueryBuilder()
      .update(AiChat)
      .set({ name: data.name })
      .where('id = :id', { id })

    if (expectedName === null || expectedName === undefined) {
      qb.andWhere('name IS NULL')
    } else {
      qb.andWhere('name = :expectedName', { expectedName })
    }

    const result = await qb.execute()
    return (result.affected ?? 0) > 0
  }

  async update(
    id: string,
    data: { messages?: ChatMessage[]; name?: string },
  ): Promise<AiChat | null> {
    const chat = await this.aiChatRepository.findOne({ where: { id } })
    if (!chat) return null

    if (data.messages) {
      const previousMessages = chat.messages
      chat.messages = data.messages
      if (!chat.name || chat.name === this.generateChatName(previousMessages)) {
        chat.name = this.generateChatName(data.messages)
      }
    }
    if (data.name !== undefined) {
      chat.name = data.name
    }

    return this.aiChatRepository.save(chat)
  }

  /**
   * Sanitises a list of user-supplied tag labels:
   *  - trims, drops empty entries
   *  - enforces per-tag length cap
   *  - dedupes case-insensitively (keeping first occurrence)
   *  - caps total tags at MAX_TAGS_PER_CHAT
   *
   * Returns null for an empty result so the simple-array column persists as NULL
   * (avoids round-tripping `[]` → `''` → `['']`).
   */
  sanitiseTags(input: unknown): string[] | null {
    if (!Array.isArray(input)) return null
    const seen = new Set<string>()
    const out: string[] = []
    for (const raw of input) {
      if (typeof raw !== 'string') continue
      // simple-array uses comma as separator, so strip commas defensively
      const trimmed = raw.replace(/,/g, '').trim().slice(0, MAX_TAG_LENGTH)
      if (!trimmed) continue
      const key = trimmed.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(trimmed)
      if (out.length >= MAX_TAGS_PER_CHAT) break
    }
    return out.length === 0 ? null : out
  }

  async updateMeta(
    id: string,
    data: { pinned?: boolean; tags?: string[]; name?: string },
  ): Promise<AiChat | null> {
    const chat = await this.aiChatRepository.findOne({ where: { id } })
    if (!chat) return null

    if (typeof data.pinned === 'boolean') {
      chat.pinned = data.pinned
    }
    if (data.tags !== undefined) {
      chat.tags = this.sanitiseTags(data.tags)
    }
    if (data.name !== undefined) {
      const trimmed = data.name.trim()
      chat.name = trimmed.length > 0 ? trimmed : null
    }

    return this.aiChatRepository.save(chat)
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.aiChatRepository.delete(id)
    return (result.affected ?? 0) > 0
  }

  private generateChatName(messages: ChatMessage[]): string {
    const firstUserMessage = messages.find((m) => m.role === 'user')
    if (firstUserMessage) {
      const content = firstUserMessage.content.trim()
      return content.length > 100 ? content.slice(0, 97) + '...' : content
    }
    return 'New conversation'
  }

  async verifyAccess(
    chatId: string,
    projectId: string,
    userId: string | null,
  ): Promise<AiChat | null> {
    if (!userId) return null

    const queryBuilder = this.aiChatRepository
      .createQueryBuilder('chat')
      .where('chat.id = :chatId', { chatId })
      .andWhere('chat.projectId = :projectId', { projectId })

    queryBuilder.andWhere('(chat.userId = :userId OR chat.userId IS NULL)', {
      userId,
    })

    return queryBuilder.getOne()
  }

  /**
   * Verifies ownership of a chat (authenticated users only).
   * Used for update/delete operations to prevent modifying shared (NULL owner) chats.
   */
  async verifyOwnerAccess(
    chatId: string,
    projectId: string,
    userId: string | null,
  ): Promise<AiChat | null> {
    if (!userId) return null

    return this.aiChatRepository
      .createQueryBuilder('chat')
      .where('chat.id = :chatId', { chatId })
      .andWhere('chat.projectId = :projectId', { projectId })
      .andWhere('chat.userId = :userId', { userId })
      .getOne()
  }

  /**
   * Verifies access to an anonymously-owned chat (userId IS NULL) by chatId+projectId.
   * This supports share-by-id without allowing listing/enumeration.
   */
  async verifyPublicChatAccess(
    chatId: string,
    projectId: string,
  ): Promise<AiChat | null> {
    return this.aiChatRepository
      .createQueryBuilder('chat')
      .where('chat.id = :chatId', { chatId })
      .andWhere('chat.projectId = :projectId', { projectId })
      .andWhere('chat.userId IS NULL')
      .getOne()
  }

  /**
   * Verify that a chat belongs to a project (without checking user ownership).
   * Used for shared chat links where anyone who can view the project can access the chat.
   */
  async verifyProjectAccess(
    chatId: string,
    projectId: string,
  ): Promise<AiChat | null> {
    return this.aiChatRepository.findOne({
      where: {
        id: chatId,
        project: { id: projectId },
      },
      relations: ['user'],
    })
  }

  /**
   * Check if the user is the owner of a chat.
   */
  isOwner(chat: AiChat, userId: string | null): boolean {
    if (!userId) return false
    return chat.user?.id === userId
  }
}
