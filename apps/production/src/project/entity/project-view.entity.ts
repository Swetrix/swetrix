import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { ApiProperty } from '@nestjs/swagger'
import { Project } from './project.entity'
import { ProjectViewCustomEventEntity } from './project-view-custom-event.entity'

export enum ProjectViewType {
  TRAFFIC = 'traffic',
  PERFORMANCE = 'performance',
}

@Entity('projects_views')
export class ProjectViewEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty()
  @Column('varchar')
  projectId: string

  @ApiProperty()
  @Column('varchar')
  name: string

  @ApiProperty({ enum: ProjectViewType })
  @Column('enum', { enum: ProjectViewType })
  type: ProjectViewType

  @ApiProperty()
  @Column('varchar')
  filters: string | null

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Project, project => project.views, { onDelete: 'CASCADE' })
  project: Project

  @ApiProperty({ type: ProjectViewCustomEventEntity, isArray: true })
  @OneToMany(
    () => ProjectViewCustomEventEntity,
    projectViewCustomEvent => projectViewCustomEvent.view,
  )
  customEvents: ProjectViewCustomEventEntity[]
}
