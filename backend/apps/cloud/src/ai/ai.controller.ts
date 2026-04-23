import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Res,
  Headers,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common'
import { Response } from 'express'
import {
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger'
import _isEmpty from 'lodash/isEmpty'

import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import { checkRateLimit, getIPFromHeaders } from '../common/utils'
import { AiService, sanitiseAssistantContent } from './ai.service'
import { AiChatService } from './ai-chat.service'
import {
  ChatDto,
  CreateChatDto,
  UpdateChatDto,
  UpdateChatMetaDto,
  GetRecentChatsQueryDto,
  GetAllChatsQueryDto,
  FeedbackDto,
} from './dto/chat.dto'
import { trackCustom } from '../common/analytics'

const AI_CHAT_RATE_LIMIT = 50
const AI_CHAT_RATE_LIMIT_UNAUTH = 20
const AI_CHAT_RATE_LIMIT_TIMEOUT = 3600

const AI_READ_RATE_LIMIT = 200
const AI_READ_RATE_LIMIT_UNAUTH = 50

@ApiTags('AI')
@Controller(['ai', 'v1/ai'])
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiChatService: AiChatService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
  ) {}

  private async applyRateLimit(
    uid: string | null,
    headers: Record<string, string>,
    operation: 'read' | 'write',
  ): Promise<void> {
    const ip = getIPFromHeaders(headers) || 'unknown'

    if (operation === 'write') {
      if (uid) {
        await checkRateLimit(
          uid,
          'ai-chat',
          AI_CHAT_RATE_LIMIT,
          AI_CHAT_RATE_LIMIT_TIMEOUT,
        )
      } else {
        await checkRateLimit(
          ip,
          'ai-chat-unauth',
          AI_CHAT_RATE_LIMIT_UNAUTH,
          AI_CHAT_RATE_LIMIT_TIMEOUT,
        )
      }
    } else {
      if (uid) {
        await checkRateLimit(
          uid,
          'ai-read',
          AI_READ_RATE_LIMIT,
          AI_CHAT_RATE_LIMIT_TIMEOUT,
        )
      } else {
        await checkRateLimit(
          ip,
          'ai-read-unauth',
          AI_READ_RATE_LIMIT_UNAUTH,
          AI_CHAT_RATE_LIMIT_TIMEOUT,
        )
      }
    }
  }

  @ApiBearerAuth()
  @Post(':pid/chat')
  @Auth(false, true) // Allow optional auth for public projects
  @ApiOperation({ summary: 'Chat with AI about project analytics' })
  @ApiResponse({ status: 200, description: 'SSE stream of AI response' })
  async chat(
    @Param('pid') pid: string,
    @Body() chatDto: ChatDto,
    @CurrentUserId() uid: string | null,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
  ) {
    this.logger.log({ uid, pid }, 'POST /ai/:pid/chat')

    await this.applyRateLimit(uid, headers, 'write')

    if (!process.env.OPENROUTER_API_KEY) {
      throw new HttpException(
        'AI features are not configured. Please set OPENROUTER_API_KEY.',
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, uid)

    if (project.admin?.dashboardBlockReason) {
      throw new ForbiddenException(
        'The account that owns this project is currently suspended due to a billing issue.',
      )
    }

    try {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')
      res.flushHeaders()

      let clientClosed = false
      res.on('close', () => {
        clientClosed = true
      })

      const messages = chatDto.messages
        .filter((m) => m.content && m.content.trim().length > 0)
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

      if (messages.length === 0) {
        throw new HttpException(
          'At least one message with content is required',
          HttpStatus.BAD_REQUEST,
        )
      }

      this.logger.log(
        { pid, uid, messageCount: messages.length },
        'Starting AI chat stream',
      )

      const result = await this.aiService.chat(
        project,
        messages,
        chatDto.timezone || 'UTC',
      )

      let hasContent = false
      let toolCallCount = 0
      let toolResultCount = 0
      let toolErrorCount = 0
      let textDeltaCount = 0
      let reasoningDeltaCount = 0
      let assistantText = ''
      let streamErrored = false
      let streamErrorEventCount = 0
      let stepCount = 0
      let lastModelId: string | undefined
      let lastProviderId: string | undefined
      const streamStartedAt = Date.now()
      try {
        for await (const part of result.fullStream) {
          if (clientClosed) {
            break
          }

          this.logger.debug(
            { pid, partType: part.type },
            'AI stream part received',
          )

          if (part.type === 'text-delta') {
            hasContent = true
            textDeltaCount++
            assistantText += part.text
            res.write(
              `data: ${JSON.stringify({ type: 'text', content: part.text })}\n\n`,
            )
            this.logger.debug(
              { pid, textLength: part.text.length },
              'AI text delta',
            )
          } else if (part.type === 'tool-call') {
            hasContent = true
            toolCallCount++
            res.write(
              `data: ${JSON.stringify({
                type: 'tool-call',
                toolName: part.toolName,
                args: part.input,
              })}\n\n`,
            )
            this.logger.log(
              { pid, toolName: part.toolName, args: part.input },
              'AI tool call',
            )
          } else if (part.type === 'tool-result') {
            toolResultCount++
            const resultPreview =
              typeof part.output === 'object'
                ? JSON.stringify(part.output).slice(0, 1000)
                : String(part.output).slice(0, 1000)
            res.write(
              `data: ${JSON.stringify({
                type: 'tool-result',
                toolName: part.toolName,
                result: resultPreview,
              })}\n\n`,
            )
            this.logger.log(
              {
                pid,
                toolName: part.toolName,
                resultLength: resultPreview.length,
              },
              'AI tool result',
            )
          } else if (part.type === 'reasoning-delta') {
            hasContent = true
            reasoningDeltaCount++
            res.write(
              `data: ${JSON.stringify({ type: 'reasoning', content: part.text })}\n\n`,
            )
          } else if (part.type === 'error') {
            streamErrored = true
            streamErrorEventCount++
            this.logger.error(
              { error: part.error, pid, uid },
              'Error event during AI stream',
            )
            res.write(
              `data: ${JSON.stringify({ type: 'error', content: 'A temporary error occurred, continuing...' })}\n\n`,
            )
          } else if (part.type === 'finish') {
            const totalUsage = (part as any)?.totalUsage ?? {}
            const durationMs = Date.now() - streamStartedAt
            const inputTokens = totalUsage.inputTokens ?? 0
            const outputTokens = totalUsage.outputTokens ?? 0
            const totalTokens =
              totalUsage.totalTokens ?? inputTokens + outputTokens
            const reasoningTokens =
              totalUsage.outputTokenDetails?.reasoningTokens ??
              totalUsage.reasoningTokens ??
              0
            const cachedInputTokens =
              totalUsage.inputTokenDetails?.cacheReadTokens ??
              totalUsage.cachedInputTokens ??
              0
            const cacheWriteTokens =
              totalUsage.inputTokenDetails?.cacheWriteTokens ?? 0

            this.logger.log(
              {
                pid,
                finishReason: (part as any).finishReason,
                totalUsage,
                durationMs,
              },
              'AI stream finish event',
            )

            await trackCustom(
              getIPFromHeaders(headers) || 'unknown',
              headers['user-agent'],
              {
                ev: 'AI_CHAT_STREAM_FINISHED',
                meta: {
                  finishReason: (part as any)?.finishReason ?? 'unknown',
                  modelId: lastModelId,
                  providerId: lastProviderId,
                  durationMs,
                  inputTokens,
                  outputTokens,
                  totalTokens,
                  reasoningTokens,
                  cachedInputTokens,
                  cacheWriteTokens,
                  stepCount,
                  toolCallCount,
                  toolResultCount,
                  toolErrorCount,
                  textDeltaCount,
                  reasoningDeltaCount,
                  assistantTextLength: assistantText.length,
                  inboundMessageCount: messages.length,
                  hasContent,
                  streamErrored,
                  streamErrorEventCount,
                  authed: Boolean(uid),
                },
              },
            )
          } else if (part.type === 'finish-step') {
            stepCount++
            const stepResponse = (part as any)?.response
            if (stepResponse?.modelId) {
              lastModelId = stepResponse.modelId
            }
            const stepProviderId =
              stepResponse?.providerId ?? stepResponse?.provider
            if (stepProviderId) {
              lastProviderId = stepProviderId
            }
            this.logger.log(
              {
                pid,
                finishReason: part.finishReason,
                usage: part.usage,
                modelId: lastModelId,
              },
              'AI stream finish-step event',
            )
          } else if (part.type === 'tool-input-start') {
            this.logger.log(
              {
                pid,
                toolName: part.toolName,
              },
              'AI tool input start',
            )
          } else if (part.type === 'tool-input-delta') {
            this.logger.debug(
              {
                pid,
                deltaLength: part.delta?.length,
              },
              'AI tool input delta',
            )
          } else if (part.type === 'tool-input-end') {
            this.logger.log({ pid }, 'AI tool input end')
          } else if (part.type === 'tool-error') {
            toolErrorCount++
            this.logger.error(
              {
                pid,
                toolName: part.toolName,
                error: part.error,
              },
              'AI tool error',
            )
          }
        }

        this.logger.log(
          {
            pid,
            toolCallCount,
            toolResultCount,
            textDeltaCount,
            hasContent,
          },
          'AI stream completed - summary',
        )
      } catch (streamError) {
        streamErrored = true
        this.logger.error(
          { error: streamError, pid, uid },
          'Exception during AI stream iteration',
        )

        if (hasContent) {
          res.write(
            `data: ${JSON.stringify({ type: 'error', content: 'The response was interrupted due to a provider error.' })}\n\n`,
          )
        } else {
          res.write(
            `data: ${JSON.stringify({ type: 'error', content: 'Failed to get a response from the AI provider. Please try again.' })}\n\n`,
          )
        }
      }

      // Generate follow-up suggestions only when the assistant produced a real
      // textual answer and the client is still connected. Capped with a short
      // timeout so a slow model never delays the `done` event; on timeout we
      // abort the in-flight OpenRouter request to avoid wasting quota.
      if (!clientClosed && !streamErrored && assistantText.trim().length > 0) {
        const FOLLOW_UPS_TIMEOUT_MS = 5_000
        const controller = new AbortController()
        const timeoutHandle = setTimeout(
          () => controller.abort(),
          FOLLOW_UPS_TIMEOUT_MS,
        )
        const onClientClose = () => controller.abort()
        res.on('close', onClientClose)
        try {
          const followUps = await Promise.race([
            this.aiService.generateFollowUps(
              [...messages, { role: 'assistant', content: assistantText }],
              project,
              controller.signal,
            ),
            new Promise<string[]>((resolve) => {
              controller.signal.addEventListener('abort', () => resolve([]), {
                once: true,
              })
            }),
          ])
          if (!clientClosed && followUps.length > 0) {
            res.write(
              `data: ${JSON.stringify({ type: 'followUps', data: followUps })}\n\n`,
            )
          }
        } catch (err) {
          this.logger.warn(
            { err, pid, uid },
            'Follow-up suggestion generation threw',
          )
        } finally {
          clearTimeout(timeoutHandle)
          res.off('close', onClientClose)
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      res.end()

      this.logger.log({ pid, uid }, 'AI chat stream completed')
    } catch (error) {
      this.logger.error({ error, pid, uid }, 'Error in AI chat')

      if (!res.headersSent) {
        throw new HttpException(
          'Failed to process AI request',
          HttpStatus.INTERNAL_SERVER_ERROR,
        )
      }

      res.write(
        `data: ${JSON.stringify({ type: 'error', content: 'An error occurred while processing your request' })}\n\n`,
      )
      res.end()
    }
  }

  @ApiBearerAuth()
  @Get(':pid/chats')
  @Auth(false, true) // Allow optional auth for public projects
  @ApiOperation({
    summary:
      'List AI chats for a project (supports search, tag, pinned filters and pagination)',
  })
  @ApiResponse({ status: 200, description: 'List of chats' })
  async getChats(
    @Param('pid') pid: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetRecentChatsQueryDto,
    @CurrentUserId() uid: string | null,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log({ uid, pid }, 'GET /ai/:pid/chats')

    await this.applyRateLimit(uid, headers, 'read')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, uid)

    // Do not expose stored chat history to unauthenticated users (even on public projects).
    if (!uid) {
      return { chats: [], total: 0 }
    }

    const isLimitMode =
      query.limit !== undefined &&
      query.skip === undefined &&
      query.take === undefined &&
      !query.search &&
      !query.tag &&
      query.pinned === undefined

    const take = isLimitMode ? (query.limit ?? 5) : (query.take ?? 20)

    const result = await this.aiChatService.listByProject(pid, uid, {
      search: query.search,
      tag: query.tag,
      pinned: query.pinned,
      skip: query.skip ?? 0,
      take,
      orderByPinned: query.orderByPinned,
    })

    return {
      chats: result.chats.map((chat) => ({
        id: chat.id,
        name: chat.name,
        pinned: chat.pinned,
        tags: chat.tags ?? [],
        created: chat.created,
        updated: chat.updated,
      })),
      total: result.total,
    }
  }

  @ApiBearerAuth()
  @Get(':pid/chats/tags')
  @Auth(false, true)
  @ApiOperation({ summary: 'List distinct tags across the user’s chats' })
  @ApiResponse({ status: 200, description: 'Sorted list of tag labels' })
  async getChatTags(
    @Param('pid') pid: string,
    @CurrentUserId() uid: string | null,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log({ uid, pid }, 'GET /ai/:pid/chats/tags')

    await this.applyRateLimit(uid, headers, 'read')

    const project = await this.projectService.getFullProject(pid)
    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }
    this.projectService.allowedToView(project, uid)

    if (!uid) {
      return { tags: [] }
    }

    const tags = await this.aiChatService.listTagsByProject(pid, uid)
    return { tags }
  }

  @ApiBearerAuth()
  @Get(':pid/chats/all')
  @Auth(false, true) // Allow optional auth for public projects
  @ApiOperation({
    summary:
      'Get all AI chats for a project (paginated). Deprecated: use GET /:pid/chats with skip/take.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of chats' })
  async getAllChats(
    @Param('pid') pid: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetAllChatsQueryDto,
    @CurrentUserId() uid: string | null,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log({ uid, pid }, 'GET /ai/:pid/chats/all')

    await this.applyRateLimit(uid, headers, 'read')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, uid)

    if (!uid) {
      return { chats: [], total: 0 }
    }

    const result = await this.aiChatService.listByProject(pid, uid, {
      skip: query.skip ?? 0,
      take: query.take ?? 20,
    })

    return {
      chats: result.chats.map((chat) => ({
        id: chat.id,
        name: chat.name,
        pinned: chat.pinned,
        tags: chat.tags ?? [],
        created: chat.created,
        updated: chat.updated,
      })),
      total: result.total,
    }
  }

  @ApiBearerAuth()
  @Get(':pid/chats/:chatId')
  @Auth(false, true) // Allow optional auth for public projects
  @ApiOperation({ summary: 'Get a specific AI chat' })
  @ApiResponse({ status: 200, description: 'Chat details with messages' })
  async getChat(
    @Param('pid') pid: string,
    @Param('chatId') chatId: string,
    @CurrentUserId() uid: string | null,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log({ uid, pid, chatId }, 'GET /ai/:pid/chats/:chatId')

    await this.applyRateLimit(uid, headers, 'read')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, uid)

    // Anyone who can view the project can view any chat via direct link
    const chat = await this.aiChatService.verifyProjectAccess(chatId, pid)

    if (!chat) {
      throw new NotFoundException('Chat not found')
    }

    // Check if the current user is the owner of this chat
    const isOwner = uid && chat.user?.id === uid

    const parentChat = chat.parentChat
      ? { id: chat.parentChat.id, name: chat.parentChat.name }
      : null

    return {
      id: chat.id,
      name: chat.name,
      messages: chat.messages,
      pinned: chat.pinned,
      tags: chat.tags ?? [],
      parentChatId: chat.parentChatId,
      parentChat,
      created: chat.created,
      updated: chat.updated,
      isOwner,
    }
  }

  @ApiBearerAuth()
  @Post(':pid/chats')
  @Auth(false, true) // Allow optional auth for public projects
  @ApiOperation({ summary: 'Create a new AI chat' })
  @ApiResponse({ status: 201, description: 'Chat created' })
  async createChat(
    @Param('pid') pid: string,
    @Body() createChatDto: CreateChatDto,
    @CurrentUserId() uid: string | null,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log({ uid, pid }, 'POST /ai/:pid/chats')

    await this.applyRateLimit(uid, headers, 'write')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, uid)

    const sanitisedCreateMessages = createChatDto.messages.map((m) =>
      m.role === 'assistant'
        ? { ...m, content: sanitiseAssistantContent(m.content) }
        : m,
    )

    let parentChatId: string | null = null
    if (createChatDto.parentChatId) {
      const parent = await this.aiChatService.findParentSummary(
        createChatDto.parentChatId,
        pid,
      )
      if (!parent) {
        throw new BadRequestException(
          'Invalid parentChatId: parent chat does not exist in this project',
        )
      }
      parentChatId = parent.id
    }

    const chat = await this.aiChatService.create({
      projectId: pid,
      userId: uid,
      messages: sanitisedCreateMessages,
      name: createChatDto.name,
      parentChatId,
    })

    await trackCustom(
      getIPFromHeaders(headers) || 'unknown',
      headers['user-agent'],
      {
        ev: 'AI_CHAT_CREATED',
      },
    )

    if (
      !createChatDto.name &&
      createChatDto.messages?.length &&
      process.env.OPENROUTER_API_KEY
    ) {
      const firstUserMsg = createChatDto.messages.find(
        (m) => m.role === 'user',
      )?.content
      if (firstUserMsg) {
        const expectedName = chat.name
        this.aiService
          .generateChatTitle(firstUserMsg)
          .then((title) =>
            this.aiChatService.updateIfNameEquals(chat.id, expectedName, {
              name: title,
            }),
          )
          .catch((err) =>
            this.logger.warn(
              { err, chatId: chat.id },
              'Background title generation failed',
            ),
          )
      }
    }

    return {
      id: chat.id,
      name: chat.name,
      messages: chat.messages,
      parentChatId: chat.parentChatId,
      created: chat.created,
      updated: chat.updated,
    }
  }

  @ApiBearerAuth()
  @Post(':pid/chats/:chatId/title')
  @Auth(false, true)
  @ApiOperation({
    summary:
      'Generate (or regenerate) a concise AI-generated title for a chat from its first user message',
  })
  @ApiResponse({ status: 200, description: 'Generated chat title' })
  async generateChatTitle(
    @Param('pid') pid: string,
    @Param('chatId') chatId: string,
    @CurrentUserId() uid: string | null,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log({ uid, pid, chatId }, 'POST /ai/:pid/chats/:chatId/title')

    await this.applyRateLimit(uid, headers, 'write')

    if (!process.env.OPENROUTER_API_KEY) {
      throw new HttpException(
        'AI features are not configured. Please set OPENROUTER_API_KEY.',
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }

    const project = await this.projectService.getFullProject(pid)
    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }
    this.projectService.allowedToView(project, uid)

    const chat = await this.aiChatService.verifyOwnerAccess(chatId, pid, uid)
    if (!chat) {
      throw new NotFoundException('Chat not found')
    }

    const firstUserMsg = chat.messages.find((m) => m.role === 'user')?.content

    if (!firstUserMsg) {
      return { id: chat.id, name: chat.name }
    }

    const title = await this.aiService.generateChatTitle(firstUserMsg)
    const updated = await this.aiChatService.update(chatId, { name: title })

    return {
      id: chatId,
      name: updated?.name || title,
    }
  }

  @ApiBearerAuth()
  @Post(':pid/chats/:chatId/feedback')
  @Auth(false, true)
  @ApiOperation({ summary: 'Submit feedback on an AI response' })
  @ApiResponse({ status: 200, description: 'Feedback recorded' })
  async submitChatFeedback(
    @Param('pid') pid: string,
    @Param('chatId') chatId: string,
    @Body() feedbackDto: FeedbackDto,
    @CurrentUserId() uid: string | null,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(
      { uid, pid, chatId, rating: feedbackDto.rating },
      'POST /ai/:pid/chats/:chatId/feedback',
    )

    await this.applyRateLimit(uid, headers, 'write')

    const project = await this.projectService.getFullProject(pid)
    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }
    this.projectService.allowedToView(project, uid)

    const chat = await this.aiChatService.verifyProjectAccess(chatId, pid)
    if (!chat) {
      throw new NotFoundException('Chat not found')
    }

    await trackCustom(
      getIPFromHeaders(headers) || 'unknown',
      headers['user-agent'],
      {
        ev: `AI_CHAT_FEEDBACK_${feedbackDto.rating.toUpperCase()}`,
        meta: {
          chatId,
          messageIndex: feedbackDto.messageIndex,
          hasComment: !!feedbackDto.comment,
        },
      },
    )

    return { success: true }
  }

  @ApiBearerAuth()
  @Post(':pid/chats/:chatId')
  @Auth(false, true) // Allow optional auth for public projects
  @ApiOperation({ summary: 'Update an AI chat' })
  @ApiResponse({ status: 200, description: 'Chat updated or branched' })
  async updateChat(
    @Param('pid') pid: string,
    @Param('chatId') chatId: string,
    @Body() updateChatDto: UpdateChatDto,
    @CurrentUserId() uid: string | null,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log({ uid, pid, chatId }, 'POST /ai/:pid/chats/:chatId')

    await this.applyRateLimit(uid, headers, 'write')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, uid)

    // Check if the chat exists and belongs to this project
    const existingChat = await this.aiChatService.verifyProjectAccess(
      chatId,
      pid,
    )

    if (!existingChat) {
      throw new NotFoundException('Chat not found')
    }

    // Check if the current user owns this chat
    const isOwner = this.aiChatService.isOwner(existingChat, uid)

    const sanitisedUpdateMessages = updateChatDto.messages
      ? updateChatDto.messages.map((m) =>
          m.role === 'assistant'
            ? { ...m, content: sanitiseAssistantContent(m.content) }
            : m,
        )
      : undefined

    if (isOwner) {
      // User owns the chat - update it directly
      const chat = await this.aiChatService.update(chatId, {
        messages: sanitisedUpdateMessages,
        name: updateChatDto.name,
      })

      if (!chat) {
        throw new NotFoundException('Chat not found')
      }

      return {
        id: chat.id,
        name: chat.name,
        messages: chat.messages,
        created: chat.created,
        updated: chat.updated,
        branched: false,
      }
    }

    // User doesn't own the chat - create a new branched chat with the messages
    const branchedChat = await this.aiChatService.create({
      projectId: pid,
      userId: uid,
      messages: sanitisedUpdateMessages || existingChat.messages,
      name: updateChatDto.name,
      parentChatId: existingChat.id,
    })

    this.logger.log(
      { uid, pid, originalChatId: chatId, newChatId: branchedChat.id },
      'Chat branched for non-owner',
    )

    return {
      id: branchedChat.id,
      name: branchedChat.name,
      messages: branchedChat.messages,
      created: branchedChat.created,
      updated: branchedChat.updated,
      branched: true,
      parentChatId: branchedChat.parentChatId ?? existingChat.id,
    }
  }

  @ApiBearerAuth()
  @Patch(':pid/chats/:chatId')
  @Auth(false, true) // Allow optional auth for public projects
  @ApiOperation({
    summary: 'Update chat metadata (pinned, tags, name) - owner only',
  })
  @ApiResponse({ status: 200, description: 'Chat metadata updated' })
  async updateChatMeta(
    @Param('pid') pid: string,
    @Param('chatId') chatId: string,
    @Body() body: UpdateChatMetaDto,
    @CurrentUserId() uid: string | null,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log({ uid, pid, chatId }, 'PATCH /ai/:pid/chats/:chatId')

    await this.applyRateLimit(uid, headers, 'write')

    const project = await this.projectService.getFullProject(pid)
    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }
    this.projectService.allowedToView(project, uid)

    const chat = await this.aiChatService.verifyOwnerAccess(chatId, pid, uid)
    if (!chat) {
      throw new NotFoundException('Chat not found')
    }

    const updated = await this.aiChatService.updateMeta(chatId, {
      pinned: body.pinned,
      tags: body.tags,
      name: body.name,
    })

    if (!updated) {
      throw new NotFoundException('Chat not found')
    }

    return {
      id: updated.id,
      name: updated.name,
      pinned: updated.pinned,
      tags: updated.tags ?? [],
      created: updated.created,
      updated: updated.updated,
    }
  }

  @ApiBearerAuth()
  @Delete(':pid/chats/:chatId')
  @Auth(false, true) // Allow optional auth for public projects
  @ApiOperation({ summary: 'Delete an AI chat' })
  @ApiResponse({ status: 200, description: 'Chat deleted' })
  async deleteChat(
    @Param('pid') pid: string,
    @Param('chatId') chatId: string,
    @CurrentUserId() uid: string | null,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log({ uid, pid, chatId }, 'DELETE /ai/:pid/chats/:chatId')

    await this.applyRateLimit(uid, headers, 'write')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, uid)

    const existingChat = await this.aiChatService.verifyOwnerAccess(
      chatId,
      pid,
      uid,
    )

    if (!existingChat) {
      throw new NotFoundException('Chat not found')
    }

    await this.aiChatService.delete(chatId)

    await trackCustom(
      getIPFromHeaders(headers) || 'unknown',
      headers['user-agent'],
      {
        ev: 'AI_CHAT_DELETED',
      },
    )

    return { success: true }
  }
}
