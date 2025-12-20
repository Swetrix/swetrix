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

export class ChatMessageDto {
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
