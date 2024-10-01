import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Project } from './project.entity'

@Entity()
export class Funnel {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 50 })
  name: string

  @Column({
    type: 'simple-array',
  })
  steps: string[]

  @CreateDateColumn()
  created: Date

  @ManyToOne(() => Project, project => project.funnels)
  @JoinColumn()
  project: Project
}
