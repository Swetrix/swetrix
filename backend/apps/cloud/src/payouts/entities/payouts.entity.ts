import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm'
import { User } from '../../user/entities/user.entity'

export enum PayoutStatus {
  /**
   * The payout is ready to be paid on the next payout date.
   * This status is assigned when we received the next payment for the subscription from the user.
   */
  processing = 'processing',
  /**
   * The payout is pending and will be paid automatically unless user cancels their subscriptions or makes a refund or chargeback.
   */
  pending = 'pending',
  /**
   * The payout was paid to the referrer.
   */
  paid = 'paid',
  /**
   * The payout was suspended for some reason. It won't be paid automatically and will require manual intervention.
   */
  suspended = 'suspended',
}

@Entity()
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // The date when the payout was created
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  // The amount of the payout
  @Column({
    type: 'decimal',
  })
  amount: number

  // The currency of the payout
  @Column({
    type: 'varchar',
    length: 3,
  })
  currency: string

  // The referral ID (user which was referred)
  @Column('varchar', { length: 36 })
  referralId: string

  // The status of the payout
  @Column({
    type: 'enum',
    enum: PayoutStatus,
    default: PayoutStatus.pending,
  })
  status: PayoutStatus

  // The date when the payout was paid
  @Column({
    type: 'timestamp',
    nullable: true,
  })
  paidAt: Date

  // The transaction ID of the payout
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  transactionId: string

  // The referrer (user which receives the payout)
  @ManyToOne(() => User, user => user.payouts)
  user: User
}
