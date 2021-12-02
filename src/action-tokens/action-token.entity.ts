import { Entity, PrimaryGeneratedColumn, ManyToOne, Timestamp, CreateDateColumn, Column } from 'typeorm'
import { User } from '../user/entities/user.entity'

export enum ActionTokenType {
  EMAIL_VERIFICATION,
  PASSWORD_RESET,
  EMAIL_CHANGE,
}

@Entity()
export class ActionToken {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => User, user => user.actionTokens, { onDelete: 'CASCADE' })
  user: User

  @CreateDateColumn()
  created: Timestamp

  @Column('varchar', { length: 254, default: null })
  newValue: string

  @Column({
    type: 'enum',
    enum: ActionTokenType,
  })
  action: ActionTokenType
}
