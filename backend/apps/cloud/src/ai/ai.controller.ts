import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Headers,
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
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
import { AiService } from './ai.service'
import { AiChatService } from './ai-chat.service'
import {
  ChatDto,
  CreateChatDto,
  UpdateChatDto,
  GetRecentChatsQueryDto,
  GetAllChatsQueryDto,
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
        .filter(m => m.content && m.content.trim().length > 0)
        .map(m => ({
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
      let textDeltaCount = 0
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
            res.write(
              `data: ${JSON.stringify({ type: 'reasoning', content: part.text })}\n\n`,
            )
          } else if (part.type === 'error') {
            this.logger.error(
              { error: part.error, pid, uid },
              'Error event during AI stream',
            )
            res.write(
              `data: ${JSON.stringify({ type: 'error', content: 'A temporary error occurred, continuing...' })}\n\n`,
            )
          } else if (part.type === 'finish') {
            this.logger.log(
              {
                pid,
                finishReason: (part as any).finishReason,
                usage: (part as any).usage,
              },
              'AI stream finish event',
            )
            await trackCustom(
              getIPFromHeaders(headers) || 'unknown',
              headers['user-agent'],
              {
                ev: 'AI_CHAT_STREAM_FINISHED',
                meta: {
                  finishReason: (part as any)?.finishReason,
                  promptTokens: (part as any)?.usage?.promptTokens ?? 0,
                  completionTokens: (part as any)?.usage?.completionTokens ?? 0,
                  totalTokens: (part as any)?.usage?.totalTokens ?? 0,
                },
              },
            )
          } else if (part.type === 'finish-step') {
            this.logger.log(
              {
                pid,
                finishReason: part.finishReason,
                usage: part.usage,
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
  @ApiOperation({ summary: 'Get recent AI chats for a project' })
  @ApiResponse({ status: 200, description: 'List of recent chats' })
  async getRecentChats(
    @Param('pid') pid: string,
    @Query() query: GetRecentChatsQueryDto,
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
      return []
    }

    const chats = await this.aiChatService.findRecentByProject(
      pid,
      uid,
      query.limit ?? 5,
    )

    return chats.map(chat => ({
      id: chat.id,
      name: chat.name,
      created: chat.created,
      updated: chat.updated,
    }))
  }

  @ApiBearerAuth()
  @Get(':pid/chats/all')
  @Auth(false, true) // Allow optional auth for public projects
  @ApiOperation({ summary: 'Get all AI chats for a project (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of chats' })
  async getAllChats(
    @Param('pid') pid: string,
    @Query() query: GetAllChatsQueryDto,
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

    // Do not expose stored chat history to unauthenticated users (even on public projects).
    if (!uid) {
      return { chats: [], total: 0 }
    }

    const result = await this.aiChatService.findAllByProject(
      pid,
      uid,
      query.skip ?? 0,
      query.take ?? 20,
    )

    return {
      chats: result.chats.map(chat => ({
        id: chat.id,
        name: chat.name,
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

    let chat

    if (project.public) {
      if (!uid) {
        chat = await this.aiChatService.verifyPublicChatAccess(chatId, pid)
      } else {
        chat = await this.aiChatService.verifyAccess(chatId, pid, uid)
      }
    } else {
      chat = await this.aiChatService.verifyOwnerAccess(chatId, pid, uid)
    }

    if (!chat) {
      throw new NotFoundException('Chat not found')
    }

    return {
      id: chat.id,
      name: chat.name,
      messages: chat.messages,
      created: chat.created,
      updated: chat.updated,
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

    const chat = await this.aiChatService.create({
      projectId: pid,
      userId: uid,
      messages: createChatDto.messages,
      name: createChatDto.name,
    })

    await trackCustom(
      getIPFromHeaders(headers) || 'unknown',
      headers['user-agent'],
      {
        ev: 'AI_CHAT_CREATED',
      },
    )

    return {
      id: chat.id,
      name: chat.name,
      messages: chat.messages,
      created: chat.created,
      updated: chat.updated,
    }
  }

  @ApiBearerAuth()
  @Post(':pid/chats/:chatId')
  @Auth(false, true) // Allow optional auth for public projects
  @ApiOperation({ summary: 'Update an AI chat' })
  @ApiResponse({ status: 200, description: 'Chat updated' })
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

    const existingChat = await this.aiChatService.verifyOwnerAccess(
      chatId,
      pid,
      uid,
    )

    if (!existingChat) {
      throw new NotFoundException('Chat not found')
    }

    const chat = await this.aiChatService.update(chatId, {
      messages: updateChatDto.messages,
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
