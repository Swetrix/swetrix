import { Entity, PrimaryGeneratedColumn, OneToMany, Column } from 'typeorm'
import { User } from '../../user/entities/user.entity'

@Entity()
export class Payouts {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  // The referrer (user which receives the payout)
  @OneToMany(() => User, user => user.payouts)
  user: User

  // TODO:
  // 1. Add a column for the amount of the payout
  // 2. Add a column for the referrals that were used to calculate the payout
  // 3. Add a column for the payout status (pending, paid, etc.)
  // ? 4. Add a column for the payout method (paypal, stripe, etc.)
  // 5. Add a column for the payout transaction ID
}
