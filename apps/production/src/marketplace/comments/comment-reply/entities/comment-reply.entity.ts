import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Comment } from '../../entities/comment.entity'

@Entity()
export class CommentReply {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Comment, comment => comment.replies)
  parentComment: Comment

  @Column()
  userId: string

  @Column('text', { nullable: true, default: null })
  text: string | null

  @CreateDateColumn()
  addedAt: Date
}
