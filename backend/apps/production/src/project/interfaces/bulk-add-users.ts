export interface BulkAddUsersResponse {
  email: string
  success: boolean
  error: string | null
  failedProjectIds?: {
    projectId: string
    reason: string
  }[]
}
