import { ProjectViewEntity } from './project-view.entity'

export enum ProjectViewCustomEventMetaValueType {
  STRING = 'string',
  INTEGER = 'integer',
  FLOAT = 'float',
}

export class ProjectViewCustomEventEntity {
  id: string

  viewId: string

  customEventName: string

  metaKey?: string

  metaValue?: string

  metricKey: string

  metaValueType: ProjectViewCustomEventMetaValueType

  createdAt: Date

  updatedAt: Date

  view: ProjectViewEntity
}
