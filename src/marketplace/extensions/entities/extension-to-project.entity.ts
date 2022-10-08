import { Project } from 'src/project/entity/project.entity'
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Extension } from './extension.entity'

@Entity()
export class ExtensionToProject {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  extensionId: string

  @Column('uuid')
  projectId: string

  @Column('boolean', { default: true })
  isActive: boolean

  @ManyToOne(() => Extension, extension => extension.extensionToProjects)
  extension: Extension

  @ManyToOne(() => Project, project => project.extensionToProjects)
  project: Project
}
