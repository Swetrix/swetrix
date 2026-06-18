import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { User } from './user.entity'

export enum SubscriptionDunningStatus {
  active = 'active',
  recovered = 'recovered',
  locked = 'locked',
  cancelled = 'cancelled',
}

export enum BillingDunningEmailStage {
  payment_failed = 'payment_failed',
  final_warning = 'final_warning',
  locked = 'locked',
}

@Entity()
@Index(['userId', 'status'])
@Index(['subID', 'status'])
@Index(['subscriptionPaymentId'])
@Index(['suspendsAt', 'status'])
export class SubscriptionDunning {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 36 })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column('varchar', { length: 32, nullable: true })
  subID: string | null

  @Column('varchar', { length: 80, nullable: true })
  subscriptionPaymentId: string | null

  @Column({
    type: 'enum',
    enum: SubscriptionDunningStatus,
    default: SubscriptionDunningStatus.active,
  })
  status: SubscriptionDunningStatus

  @Column('int', { default: 1 })
  attempt: number

  @Column({
    type: 'enum',
    enum: BillingDunningEmailStage,
    nullable: true,
  })
  emailStage: BillingDunningEmailStage | null

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null

  @Column({ type: 'timestamp', nullable: true })
  lastFailedAt: Date | null

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date | null

  @Column({ type: 'timestamp', nullable: true })
  suspendsAt: Date | null

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
