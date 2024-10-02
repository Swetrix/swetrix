export interface HttpRequestOptions {
  type: string
  url: string
  interval: number
  retries: number
  retryInterval: number
  timeout: number
  acceptedStatusCodes: number[]
  httpOptions: {
    method: string
    body?: Record<string, unknown>
    headers?: Record<string, string>
  }
}
