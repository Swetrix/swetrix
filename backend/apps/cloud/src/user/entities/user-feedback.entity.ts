import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity()
export class UserFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 36 })
  userId: string

  @Column('text')
  message: string

  @Column('json')
  attachmentUrls: string[]

  @CreateDateColumn()
  createdAt: Date
}
