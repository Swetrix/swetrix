import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'

export enum InvoiceStatus {
  PAID = 'paid',
  REFUNDED = 'refunded',
  PENDING = 'pending',
}

@Entity('billing_invoice')
export class BillingInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column('varchar', { length: 36 })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column('varchar', { length: 20, default: 'paddle' })
  provider: string

  @Index({ unique: true })
  @Column('varchar', { length: 100 })
  providerPaymentId: string

  @Column('varchar', { length: 20, nullable: true })
  providerSubscriptionId: string | null

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number

  @Column('varchar', { length: 3 })
  currency: string

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PAID,
  })
  status: InvoiceStatus

  @Column('varchar', { length: 50, nullable: true })
  planCode: string | null

  @Column('varchar', { length: 10, nullable: true })
  billingFrequency: string | null

  @Column('varchar', { length: 500, nullable: true })
  receiptUrl: string | null

  @Column({ type: 'timestamp' })
  billedAt: Date

  @CreateDateColumn()
  createdAt: Date
}
