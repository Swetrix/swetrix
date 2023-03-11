import {
  Column,
  CreateDateColumn,
  Entity,
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

  @Column('varchar', { length: 254 })
  email: string

  @Column('enum', { default: ReportFrequency.MONTHLY, enum: ReportFrequency })
  reportFrequency: ReportFrequency

  @Column('boolean', { default: false })
  isConfirmed: boolean

  @CreateDateColumn()
  addedAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Project, project => project.subscribers)
  project: Project
}
