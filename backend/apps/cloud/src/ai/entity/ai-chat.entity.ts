import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'
import { Project } from '../../project/entity/project.entity'
import { User } from '../../user/entities/user.entity'

export interface ChatMessageToolCall {
  toolName: string
  args?: unknown
  timestamp?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  followUps?: string[]
  toolCalls?: ChatMessageToolCall[]
}

@Entity('ai_chat')
export class AiChat {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty()
  @Column('varchar', { length: 200, nullable: true })
  name: string | null

  @ApiProperty()
  @Column('json')
  messages: ChatMessage[]

  @ApiProperty()
  @Column('boolean', { default: false })
  pinned: boolean

  @ApiProperty({ type: [String], nullable: true })
  @Column('simple-array', { nullable: true, default: null })
  tags: string[] | null

  @ApiProperty({ type: () => Project })
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn()
  project: Project

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn()
  user: User | null

  @ApiProperty({ required: false, nullable: true })
  @Column('varchar', { name: 'parent_chat_id', length: 36, nullable: true })
  parentChatId: string | null

  @ApiProperty()
  @CreateDateColumn()
  created: Date

  @ApiProperty()
  @UpdateDateColumn()
  updated: Date
}
