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
} from 'class-validator'
import { Type, Transform } from 'class-transformer'

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
  content: string
}

export class ChatDto {
  @ApiProperty({
    type: [ChatMessageDto],
    description: 'Array of chat messages',
  })
  @IsArray()
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
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[]

  @ApiProperty({
    required: false,
    description: 'Custom name for the chat',
  })
  @IsOptional()
  @IsString()
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
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages?: ChatMessageDto[]

  @ApiProperty({
    required: false,
    description: 'Custom name for the chat',
  })
  @IsOptional()
  @IsString()
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
