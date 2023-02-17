import { Extension } from '../../extensions/entities/extension.entity'
import { User } from '../../../user/entities/user.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity()
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  extensionId: string

  @Column()
  userId: string

  @Column('text', { nullable: true, default: null })
  text: string | null

  @Column('int', { nullable: true, default: null })
  rating: number | null

  @CreateDateColumn()
  addedAt: Date

  @ManyToOne(() => Extension, extension => extension.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  extension: Extension

  @ManyToOne(() => User, user => user.comments, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User

  @Column({ type: 'text', nullable: true, default: null })
  reply: string | null
}
