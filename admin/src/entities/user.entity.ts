import "reflect-metadata";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from "typeorm";
import { Project } from './project.entity.js'
import { OrganisationMember } from './organisation-member.entity.js'

export enum PlanCode {
  none = 'none',
  free = 'free',
  trial = 'trial',
  hobby = 'hobby',
  freelancer = 'freelancer',
  '50k' = '50k',
  '100k' = '100k',
  '200k' = '200k',
  '500k' = '500k',
  startup = 'startup',
  '2m' = '2m',
  enterprise = 'enterprise',
  '10m' = '10m',
  '15m' = '15m',
  '20m' = '20m',
}

export enum DashboardBlockReason {
  'exceeding_plan_limits' = 'exceeding_plan_limits',
  'trial_ended' = 'trial_ended',
  'payment_failed' = 'payment_failed',
  'subscription_cancelled' = 'subscription_cancelled',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'enum',
    enum: PlanCode,
    default: PlanCode.none,
  })
  planCode: PlanCode

  @Column('varchar', { length: 100, nullable: true, default: null })
  nickname: string | null

  @Column('varchar', { length: 254, unique: true })
  email: string

  @Column({ type: "boolean", default: false })
  isActive: boolean

  @Column({ type: 'timestamp', nullable: true })
  trialEndDate: Date | null

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated: Date

  @Column('int', { default: 50 })
  maxProjects: number

  @Column({
    type: 'enum',
    enum: DashboardBlockReason,
    nullable: true,
  })
  dashboardBlockReason: DashboardBlockReason | null

  @Column({ type: "boolean", default: false })
  isAccountBillingSuspended: boolean

  @Column({
    type: 'varchar',
    length: 36,
    unique: true,
    nullable: true,
    default: null,
  })
  apiKey: string | null

  @Column({ type: "boolean", default: false })
  isTwoFactorAuthenticationEnabled: boolean

  @OneToMany(() => Project, project => project.admin)
  projects: Project[]

  @OneToMany(() => OrganisationMember, membership => membership.user)
  organisationMemberships: OrganisationMember[]
}
