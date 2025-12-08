import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Res,
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
  ApiQuery,
} from '@nestjs/swagger'
import _isEmpty from 'lodash/isEmpty'

import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import { AiService } from './ai.service'
import { AiChatService } from './ai-chat.service'
import { ChatDto, CreateChatDto, UpdateChatDto } from './dto/chat.dto'

@ApiTags('AI')
@Controller(['ai', 'v1/ai'])
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiChatService: AiChatService,
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
  ) {}

  @ApiBearerAuth()
  @Post(':pid/chat')
  @Auth()
  @ApiOperation({ summary: 'Chat with AI about project analytics' })
  @ApiResponse({ status: 200, description: 'SSE stream of AI response' })
  async chat(
    @Param('pid') pid: string,
    @Body() chatDto: ChatDto,
    @CurrentUserId() uid: string,
    @Res() res: Response,
  ) {
    this.logger.log({ uid, pid }, 'POST /ai/:pid/chat')

    // Check if OpenRouter API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      throw new HttpException(
        'AI features are not configured. Please set OPENROUTER_API_KEY.',
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }

    // Get and validate project access
    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, uid)

    // Check billing status
    if (project.admin?.dashboardBlockReason) {
      throw new ForbiddenException(
        'The account that owns this project is currently suspended due to a billing issue.',
      )
    }

    try {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')
      res.flushHeaders()

      // Convert messages to CoreMessage format, filtering out empty messages
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

      // Get streaming response from AI
      const result = await this.aiService.chat(
        project,
        messages,
        chatDto.timezone || 'UTC',
      )

      // Stream the full response including tool calls and reasoning
      // Wrap in try-catch to handle provider errors gracefully
      let hasContent = false
      let toolCallCount = 0
      let toolResultCount = 0
      let textDeltaCount = 0
      try {
        for await (const part of result.fullStream) {
          this.logger.debug(
            { pid, partType: part.type },
            'AI stream part received',
          )

          if (part.type === 'text-delta') {
            hasContent = true
            textDeltaCount++
            res.write(
              `data: ${JSON.stringify({ type: 'text', content: part.textDelta })}\n\n`,
            )
            this.logger.debug(
              { pid, textLength: part.textDelta.length },
              'AI text delta',
            )
          } else if (part.type === 'tool-call') {
            hasContent = true
            toolCallCount++
            // Send tool call info for UI feedback
            res.write(
              `data: ${JSON.stringify({
                type: 'tool-call',
                toolName: part.toolName,
                args: part.args,
              })}\n\n`,
            )
            this.logger.log(
              { pid, toolName: part.toolName, args: part.args },
              'AI tool call',
            )
          } else if (part.type === 'tool-result') {
            toolResultCount++
            // Send tool result for transparency (limit result size to avoid huge payloads)
            const resultPreview =
              typeof part.result === 'object'
                ? JSON.stringify(part.result).slice(0, 1000)
                : String(part.result).slice(0, 1000)
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
          } else if (part.type === 'reasoning') {
            hasContent = true
            // Stream reasoning/thinking tokens if available
            res.write(
              `data: ${JSON.stringify({ type: 'reasoning', content: part.textDelta })}\n\n`,
            )
          } else if (part.type === 'error') {
            // Handle errors during streaming (emitted by AI SDK)
            this.logger.error(
              { error: part.error, pid, uid },
              'Error event during AI stream',
            )
            // Don't end the stream on error events - the provider may continue
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
          } else if (part.type === 'step-finish') {
            this.logger.log(
              {
                pid,
                stepType: (part as any).stepType,
                finishReason: (part as any).finishReason,
                isContinued: (part as any).isContinued,
              },
              'AI stream step-finish event',
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
        // Handle errors thrown during stream iteration (e.g., malformed provider responses)
        this.logger.error(
          { error: streamError, pid, uid },
          'Exception during AI stream iteration',
        )

        // If we already have some content, send what we have with an error notice
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

      // Send done event
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      res.end()

      this.logger.log({ pid, uid }, 'AI chat stream completed')
    } catch (error) {
      this.logger.error({ error, pid, uid }, 'Error in AI chat')

      // If headers not sent yet, throw error
      if (!res.headersSent) {
        throw new HttpException(
          'Failed to process AI request',
          HttpStatus.INTERNAL_SERVER_ERROR,
        )
      }

      // If streaming already started, send error event
      res.write(
        `data: ${JSON.stringify({ type: 'error', content: 'An error occurred while processing your request' })}\n\n`,
      )
      res.end()
    }
  }

  @ApiBearerAuth()
  @Get(':pid/chats')
  @Auth()
  @ApiOperation({ summary: 'Get recent AI chats for a project' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of recent chats' })
  async getRecentChats(
    @Param('pid') pid: string,
    @Query('limit') limit: string,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid, pid }, 'GET /ai/:pid/chats')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, uid)

    const chats = await this.aiChatService.findRecentByProject(
      pid,
      uid,
      limit ? parseInt(limit, 10) : 5,
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
  @Auth()
  @ApiOperation({ summary: 'Get all AI chats for a project (paginated)' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of chats' })
  async getAllChats(
    @Param('pid') pid: string,
    @Query('skip') skip: string,
    @Query('take') take: string,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid, pid }, 'GET /ai/:pid/chats/all')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, uid)

    const result = await this.aiChatService.findAllByProject(
      pid,
      uid,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
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
  @Auth()
  @ApiOperation({ summary: 'Get a specific AI chat' })
  @ApiResponse({ status: 200, description: 'Chat details with messages' })
  async getChat(
    @Param('pid') pid: string,
    @Param('chatId') chatId: string,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid, pid, chatId }, 'GET /ai/:pid/chats/:chatId')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    // Check if user is allowed to view the project (includes public projects)
    this.projectService.allowedToView(project, uid)

    // For shared chat links, only verify the chat belongs to the project
    // Users who can view the project can access any chat in that project
    const chat = await this.aiChatService.verifyProjectAccess(chatId, pid)

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
  @Auth()
  @ApiOperation({ summary: 'Create a new AI chat' })
  @ApiResponse({ status: 201, description: 'Chat created' })
  async createChat(
    @Param('pid') pid: string,
    @Body() createChatDto: CreateChatDto,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid, pid }, 'POST /ai/:pid/chats')

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
  @Auth()
  @ApiOperation({ summary: 'Update an AI chat' })
  @ApiResponse({ status: 200, description: 'Chat updated' })
  async updateChat(
    @Param('pid') pid: string,
    @Param('chatId') chatId: string,
    @Body() updateChatDto: UpdateChatDto,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid, pid, chatId }, 'POST /ai/:pid/chats/:chatId')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, uid)

    const existingChat = await this.aiChatService.verifyAccess(chatId, pid, uid)

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
  @Auth()
  @ApiOperation({ summary: 'Delete an AI chat' })
  @ApiResponse({ status: 200, description: 'Chat deleted' })
  async deleteChat(
    @Param('pid') pid: string,
    @Param('chatId') chatId: string,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid, pid, chatId }, 'DELETE /ai/:pid/chats/:chatId')

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, uid)

    const existingChat = await this.aiChatService.verifyAccess(chatId, pid, uid)

    if (!existingChat) {
      throw new NotFoundException('Chat not found')
    }

    await this.aiChatService.delete(chatId)

    return { success: true }
  }
}
