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
import { ComplaintStatus } from '../enums/complaint-status.enum'

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

  @Column('text', { nullable: true, default: null })
  reply: string | null

  @Column('enum', { enum: ComplaintStatus, default: ComplaintStatus.PENDING })
  status: ComplaintStatus

  @Column('boolean', { default: false })
  isResolved: boolean

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
