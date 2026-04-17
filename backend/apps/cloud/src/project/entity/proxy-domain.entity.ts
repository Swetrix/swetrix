import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { Project } from './project.entity'

export enum ProxyDomainStatus {
  WAITING = 'waiting',
  ISSUING = 'issuing',
  LIVE = 'live',
  ERROR = 'error',
}

@Entity('proxy_domain')
export class ProxyDomain {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty()
  @Index()
  @Column('varchar', { length: 12 })
  projectId: string

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project

  // Customer-controlled hostname (e.g. "t.example.com")
  @ApiProperty()
  @Index({ unique: true })
  @Column('varchar', { length: 253 })
  hostname: string

  // 32-char hex; CNAME target = "<proxyTargetId>.proxy.swetrix.org"
  @ApiProperty()
  @Index({ unique: true })
  @Column('varchar', { length: 32 })
  proxyTargetId: string

  @ApiProperty({ enum: ProxyDomainStatus })
  @Column({
    type: 'enum',
    enum: ProxyDomainStatus,
    default: ProxyDomainStatus.WAITING,
  })
  status: ProxyDomainStatus

  @ApiProperty({ nullable: true })
  @Column('varchar', { length: 500, nullable: true, default: null })
  errorMessage: string | null

  @ApiProperty({ nullable: true })
  @Column('datetime', { nullable: true, default: null })
  lastCheckedAt: Date | null

  @ApiProperty({ nullable: true })
  @Column('datetime', { nullable: true, default: null })
  liveSince: Date | null

  // Updated whenever `status` transitions. Used by the verifier to escalate
  // domains stuck in `issuing` to `error` after a timeout.
  @ApiProperty({ nullable: true })
  @Column('datetime', { nullable: true, default: null })
  statusChangedAt: Date | null

  @ApiProperty()
  @CreateDateColumn()
  created: Date
}
