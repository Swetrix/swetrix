import { Project } from './Project'

export interface SharedProject {
  id: string
  confirmed: boolean
  role: string
  created: string
  updated: string
  project: Project
  uiHidden: boolean
}
