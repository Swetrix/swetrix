export interface Monitor {
  id: string
  type: string
  name: string
  url: string
  interval: number
  retries: number
  retryInterval: number
  timeout: number
  acceptedStatusCodes: number[]
  description: string | null
  projectId: string
  createdAt: Date
  updatedAt: Date
  httpOptions: {
    method: string[]
    body?: Record<string, unknown>
    headers?: Record<string, string>
  }
}
