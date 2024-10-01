import { Project } from './project.entity'
import { ProjectViewCustomEventEntity } from './project-view-custom-event.entity'

export enum ProjectViewType {
  TRAFFIC = 'traffic',
  PERFORMANCE = 'performance',
}

export class ProjectViewEntity {
  id: string

  projectId: string

  name: string

  type: ProjectViewType

  filters: string | null

  createdAt: Date

  updatedAt: Date

  project: Project

  customEvents: ProjectViewCustomEventEntity[]
}
