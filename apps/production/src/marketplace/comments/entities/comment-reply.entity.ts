import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Comment } from './comment.entity'

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
}
