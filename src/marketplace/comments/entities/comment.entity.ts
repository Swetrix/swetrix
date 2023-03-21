import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Extension } from '../../extensions/entities/extension.entity'
import { User } from '../../../user/entities/user.entity'

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  extensionId: number

  @Column()
  userId: number

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
}
