import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm'
import { Comment } from './comment.entity'
import { User } from '../../../user/entities/user.entity'

@Entity()
export class CommentReply {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Comment, comment => comment.replies)
  parentComment: Comment

  @Column()
  userId: string

  @Column('text')
  text: string

  @CreateDateColumn()
  addedAt: Date

  @ManyToOne(() => User, user => user.commentReplies)
  @JoinColumn()
  user: User
}
