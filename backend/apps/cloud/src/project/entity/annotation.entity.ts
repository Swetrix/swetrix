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
export class Annotation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('date')
  date: Date

  @Column('varchar', { length: 120 })
  text: string

  @CreateDateColumn()
  created: Date

  @ManyToOne(() => Project, (project) => project.annotations)
  @JoinColumn()
  project: Project
}
