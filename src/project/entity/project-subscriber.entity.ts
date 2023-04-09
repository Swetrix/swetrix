import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { ReportFrequency } from '../enums'
import { Project } from './project.entity'

@Entity()
export class ProjectSubscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 12 })
  projectId: string

  @Column('varchar', { length: 254 })
  email: string

  @Column('enum', { enum: ReportFrequency })
  reportFrequency: ReportFrequency

  @Column('boolean', { default: false })
  isConfirmed: boolean

  @Column('boolean', { default: false })
  isTransferring: boolean

  @CreateDateColumn()
  addedAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Project, project => project.subscribers)
  @JoinColumn()
  project: Project
}
