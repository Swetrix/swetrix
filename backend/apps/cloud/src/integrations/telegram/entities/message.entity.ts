import type { Convenience } from 'telegraf/types'
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar')
  chatId: string

  @Column('text')
  text: string

  @Column('json', { nullable: true, default: null })
  extra: Convenience.ExtraReplyMessage | null

  @CreateDateColumn()
  createdAt: Date
}
