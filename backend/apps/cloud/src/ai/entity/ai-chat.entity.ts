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

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

  @ApiProperty({ type: () => Project })
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn()
  project: Project

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn()
  user: User | null

  @ApiProperty()
  @CreateDateColumn()
  created: Date

  @ApiProperty()
  @UpdateDateColumn()
  updated: Date
}
