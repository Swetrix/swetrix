import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity()
export class CancellationFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 254, nullable: true })
  email: string

  @Column('varchar', { length: 50, nullable: true })
  planCode: string

  @Column('text', { nullable: true })
  feedback: string

  @CreateDateColumn()
  createdAt: Date
}
