import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Project } from './project.entity'

@Entity()
export class ProjectAnnotations {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 12 })
  projectId: string

  @Column('varchar', { length: 254 })
  name: string

  @Column('varchar', { length: 254 })
  date: string

  @CreateDateColumn()
  addedAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Project, project => project.subscribers)
  @JoinColumn()
  project: Project
}
