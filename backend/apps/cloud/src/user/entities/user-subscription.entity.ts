import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { User } from './user.entity'

// Every Paddle subscription id a user has ever had. `user.subID` only holds the
// current one and is cleared once a cancellation lapses, and Paddle Classic
// mints a brand new subscription id when a churned customer comes back - so
// without this table the invoice history of cancelled and returning customers
// becomes permanently unreachable
@Entity()
@Index(['userId'])
@Index(['subID'], { unique: true })
export class UserSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 36 })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column('varchar', { length: 32 })
  subID: string

  // Paddle's customer id - unlike the subscription id it survives a resubscribe
  @Column('varchar', { length: 32, nullable: true })
  paddleUserId: string | null

  // Paddle plan (product) id the subscription was opened on
  @Column('varchar', { length: 16, nullable: true })
  planId: string | null

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date | null

  @CreateDateColumn()
  createdAt: Date
}
