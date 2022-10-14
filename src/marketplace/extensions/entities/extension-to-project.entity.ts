import { Project } from '../../../project/entity/project.entity'
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Extension } from './extension.entity'

@Entity()
export class ExtensionToProject {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  extensionId: string

  @Column()
  projectId: string

  @Column('boolean', { default: true })
  isActive: boolean

  @ManyToOne(() => Extension, extension => extension.projects)
  @JoinColumn()
  extension: Extension

  @ManyToOne(() => Project, project => project.extensions)
  @JoinColumn()
  project: Project
}
