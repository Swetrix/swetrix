import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm'
import { ActionToken } from 'src/action-tokens/action-token.entity'

export enum UserType {
  FREE = 'free',
  TIER_1 = 'tier_1',
  TIER_2 = 'tier_2',
  ENTERPRISE = 'enterprise',
  ADMIN = 'admin'
}

export const MAX_EMAIL_REQUESTS = 4 // 1 confirmation email on sign up + 3 additional ones

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'set',
    enum: UserType,
    default: UserType.FREE
  })
  roles: UserType[]

  @Column('varchar', { length: 254, unique: true })
  email: string

  @Column('varchar', { length: 200, default: '' })
  password: string

  @Column({ default: false })
  isActive: boolean

  @Column('int', { default: 1 })
  emailRequests: number

  // @Column('datetime', { nullable: true, default: null })
  // consent: Date

  @OneToMany(() => ActionToken, actionToken => actionToken.user)
  actionTokens: ActionToken[]
}