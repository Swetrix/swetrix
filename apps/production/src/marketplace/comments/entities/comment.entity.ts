import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Extension } from '../../extensions/entities/extension.entity'
import { User } from '../../../user/entities/user.entity'
import { CommentReply } from '../comment-reply/entities/comment-reply.entity'

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

  @OneToMany(() => CommentReply, reply => reply.parentComment)
  replies: CommentReply[]
}
