import { ApiProperty } from '@nestjs/swagger'
import {
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsIn,
  IsOptional,
} from 'class-validator'
import { Type } from 'class-transformer'

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
