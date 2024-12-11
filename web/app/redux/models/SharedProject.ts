import { Project } from './Project'

export interface ProjectForShared extends Project {
  shared?: boolean
}

export interface SharedProject {
  id: string
  confirmed: boolean
  role: string
  created: string
  updated: string
  project: ProjectForShared
  uiHidden: boolean
}
