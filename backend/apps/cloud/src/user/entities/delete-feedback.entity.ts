import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity()
export class DeleteFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('text', {
    nullable: true,
  })
  feedback: string

  @CreateDateColumn()
  createdAt: Date
}
