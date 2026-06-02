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

import { BillingFrequency, User } from './user.entity'
import { UserAddon } from './user-addon.entity'

export enum UserAddonChargeKind {
  initial = 'initial',
  prorated = 'prorated',
  renewal = 'renewal',
}

export enum UserAddonChargeStatus {
  pending = 'pending',
  succeeded = 'succeeded',
  failed = 'failed',
}

@Entity()
@Index(['addonId', 'createdAt'])
@Index(['idempotencyKey'], { unique: true })
export class UserAddonCharge {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 36 })
  addonId: string

  @ManyToOne(() => UserAddon, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addonId' })
  addon: UserAddon

  @Column('varchar', { length: 36 })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({
    type: 'enum',
    enum: UserAddonChargeKind,
  })
  kind: UserAddonChargeKind

  @Column({
    type: 'enum',
    enum: UserAddonChargeStatus,
    default: UserAddonChargeStatus.pending,
  })
  status: UserAddonChargeStatus

  @Column('int')
  quantity: number

  @Column('int', { nullable: true })
  previousQuantity: number | null

  @Column({
    type: 'enum',
    enum: BillingFrequency,
  })
  billingInterval: BillingFrequency

  @Column('decimal', { precision: 10, scale: 2 })
  amount: string

  @Column('varchar', { length: 3 })
  currency: string

  @Column({ type: 'timestamp', nullable: true })
  periodStart: Date | null

  @Column({ type: 'timestamp', nullable: true })
  periodEnd: Date | null

  @Column('varchar', { length: 191, nullable: true })
  idempotencyKey: string | null

  @Column('int', { nullable: true })
  paddleInvoiceId: number | null

  @Column('varchar', { length: 80, nullable: true })
  paddleOrderId: string | null

  @Column('varchar', { length: 80, nullable: true })
  paddleStatus: string | null

  @Column('varchar', { length: 300, nullable: true })
  paddleReceiptUrl: string | null

  @Column({ type: 'json', nullable: true })
  paddleResponse: Record<string, unknown> | null

  @Column('text', { nullable: true })
  failureReason: string | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
