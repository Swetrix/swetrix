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

import { User, BillingFrequency } from './user.entity'

export enum UserAddonCode {
  websites = 'websites',
}

export enum UserAddonStatus {
  active = 'active',
  past_due = 'past_due',
  cancelled = 'cancelled',
}

@Entity()
@Index(['userId', 'code'], { unique: true })
@Index(['nextChargeDate', 'status'])
export class UserAddon {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 36 })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({
    type: 'enum',
    enum: UserAddonCode,
  })
  code: UserAddonCode

  @Column('int', { default: 0 })
  quantity: number

  @Column('int', { nullable: true })
  pendingQuantity: number | null

  @Column({
    type: 'enum',
    enum: BillingFrequency,
    default: BillingFrequency.Monthly,
  })
  billingInterval: BillingFrequency

  @Column({
    type: 'enum',
    enum: BillingFrequency,
    nullable: true,
  })
  pendingBillingInterval: BillingFrequency | null

  @Column('varchar', { length: 3, default: 'USD' })
  currency: string

  @Column({ type: 'timestamp', nullable: true })
  periodStart: Date | null

  @Column({ type: 'timestamp', nullable: true })
  periodEnd: Date | null

  @Column({ type: 'timestamp', nullable: true })
  nextChargeDate: Date | null

  @Column({
    type: 'enum',
    enum: UserAddonStatus,
    default: UserAddonStatus.active,
  })
  status: UserAddonStatus

  @Column('int', { default: 0 })
  failedChargeAttempts: number

  @Column({ type: 'timestamp', nullable: true })
  lastChargeFailedAt: Date | null

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
