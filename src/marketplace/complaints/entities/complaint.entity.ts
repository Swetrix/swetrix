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
export class Complaint {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  extensionId: number

  @Column()
  userId: number

  @Column('text')
  description: string

  @CreateDateColumn()
  sendedAt: Date

  @ManyToOne(() => Extension, extension => extension.complaints, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  extension: Extension

  @ManyToOne(() => User, user => user.complaints, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: User
}
