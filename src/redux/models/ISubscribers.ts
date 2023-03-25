import { reportFrequencies } from '../constants'

export interface ISubscribers {
    userId: string
    projectId: string
    projectName: string
    email: string
    reportFrequency: typeof reportFrequencies[number]
    origin: string
    id: string
    isConfirmed: boolean
    addedAt: string
    updatedAt: string
}
