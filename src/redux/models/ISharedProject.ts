import { IProject } from './IProject'

export interface ISharedProject {
    id: string
    confirmed: boolean
    role: string
    created: string
    updated: string
    project: IProject
    uiHidden: boolean
}
