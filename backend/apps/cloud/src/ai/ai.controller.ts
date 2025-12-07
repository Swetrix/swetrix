import {
  Controller,
  Post,
  Body,
  Param,
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
} from '@nestjs/swagger'
import _isEmpty from 'lodash/isEmpty'

import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { ProjectService } from '../project/project.service'
import { AppLoggerService } from '../logger/logger.service'
import { AiService } from './ai.service'
import { ChatDto } from './dto/chat.dto'

@ApiTags('AI')
@Controller(['ai', 'v1/ai'])
export class AiController {
  constructor(
    private readonly aiService: AiService,
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

      // Get streaming response from AI
      const result = await this.aiService.chat(
        project,
        messages,
        chatDto.timezone || 'UTC',
      )

      // Stream the full response including tool calls and reasoning
      for await (const part of result.fullStream) {
        if (part.type === 'text-delta') {
          res.write(
            `data: ${JSON.stringify({ type: 'text', content: part.textDelta })}\n\n`,
          )
        } else if (part.type === 'tool-call') {
          // Send tool call info for UI feedback
          res.write(
            `data: ${JSON.stringify({
              type: 'tool-call',
              toolName: part.toolName,
              args: part.args,
            })}\n\n`,
          )
        } else if (part.type === 'tool-result') {
          // Send tool result for transparency
          res.write(
            `data: ${JSON.stringify({
              type: 'tool-result',
              toolName: part.toolName,
              result: part.result,
            })}\n\n`,
          )
        } else if (part.type === 'reasoning') {
          // Stream reasoning/thinking tokens if available
          res.write(
            `data: ${JSON.stringify({ type: 'reasoning', content: part.textDelta })}\n\n`,
          )
        }
      }

      // Send done event
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      res.end()
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
}
