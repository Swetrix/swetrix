import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from './user.entity'

@Entity()
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 36 })
  userId: string

  @Column('text')
  refreshToken: string

  @ManyToOne(() => User, user => user.refreshTokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: User

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date
}
