import { ApiProperty } from '@nestjs/swagger'
import {
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsIn,
  IsOptional,
  IsInt,
  Min,
  Max,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator'
import { Type, Transform } from 'class-transformer'

const MAX_MESSAGES_PER_CHAT = 50
const MAX_MESSAGE_LENGTH = 5000
const MAX_CHAT_NAME_LENGTH = 200
const MAX_TOOL_CALLS_PER_MESSAGE = 50
const MAX_TOOL_NAME_LENGTH = 100

class ChatMessageToolCallDto {
  @ApiProperty({ description: 'Tool name that was invoked' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(MAX_TOOL_NAME_LENGTH)
  toolName: string

  @ApiProperty({
    description: 'Arguments the tool was called with (arbitrary JSON)',
  })
  @IsOptional()
  args?: unknown

  @ApiProperty({
    required: false,
    description: 'ISO timestamp when the tool call was issued',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  timestamp?: string
}

class ChatMessageDto {
  @ApiProperty({
    enum: ['user', 'assistant'],
    description: 'The role of the message sender',
  })
  @IsNotEmpty()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant'

  @ApiProperty({
    description: 'The content of the message',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH)
  content: string

  @ApiProperty({
    required: false,
    type: [String],
    description: 'AI-suggested follow-up prompts for this assistant message',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(140, { each: true })
  followUps?: string[]

  @ApiProperty({
    required: false,
    type: [ChatMessageToolCallDto],
    description:
      'Tool calls performed while producing this assistant message (used for the "How I got this" breakdown)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TOOL_CALLS_PER_MESSAGE)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageToolCallDto)
  toolCalls?: ChatMessageToolCallDto[]
}

export class ChatDto {
  @ApiProperty({
    type: [ChatMessageDto],
    description: 'Array of chat messages',
  })
  @IsArray()
  @ArrayMaxSize(MAX_MESSAGES_PER_CHAT)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[]

  @ApiProperty({
    required: false,
    description: 'Timezone for date/time context',
  })
  @IsOptional()
  @IsString()
  timezone?: string

  @ApiProperty({
    required: false,
    description: 'Chat ID to continue an existing conversation',
  })
  @IsOptional()
  @IsString()
  chatId?: string
}

export class CreateChatDto {
  @ApiProperty({
    type: [ChatMessageDto],
    description: 'Array of chat messages',
  })
  @IsArray()
  @ArrayMaxSize(MAX_MESSAGES_PER_CHAT)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[]

  @ApiProperty({
    required: false,
    description: 'Custom name for the chat',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_CHAT_NAME_LENGTH)
  name?: string
}

export class UpdateChatDto {
  @ApiProperty({
    type: [ChatMessageDto],
    required: false,
    description: 'Array of chat messages',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_MESSAGES_PER_CHAT)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages?: ChatMessageDto[]

  @ApiProperty({
    required: false,
    description: 'Custom name for the chat',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_CHAT_NAME_LENGTH)
  name?: string
}

export class GetRecentChatsQueryDto {
  @ApiProperty({
    required: false,
    description: 'Maximum number of chats to return (1-50)',
    default: 5,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number
}

export class FeedbackDto {
  @ApiProperty({
    enum: ['good', 'bad'],
    description: 'User feedback on the AI response',
  })
  @IsNotEmpty()
  @IsIn(['good', 'bad'])
  rating: 'good' | 'bad'

  @ApiProperty({ required: false, description: 'Optional comment' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string

  @ApiProperty({
    required: false,
    description: 'Index of the assistant message the rating refers to',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  messageIndex?: number
}

export class GetAllChatsQueryDto {
  @ApiProperty({
    required: false,
    description: 'Number of chats to skip (0 or greater)',
    default: 0,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  @Max(10000)
  skip?: number

  @ApiProperty({
    required: false,
    description: 'Number of chats to return (1-100)',
    default: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number
}
