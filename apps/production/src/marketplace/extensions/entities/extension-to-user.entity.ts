import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from '../../../user/entities/user.entity'
import { Extension } from './extension.entity'

@Entity()
export class ExtensionToUser {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  extensionId: string

  @Column()
  userId: string

  @Column('boolean', { default: true })
  isActive: boolean

  @ManyToOne(() => Extension, extension => extension.users)
  @JoinColumn()
  extension: Extension

  @ManyToOne(() => User, user => user.extensions)
  @JoinColumn()
  user: User
}
