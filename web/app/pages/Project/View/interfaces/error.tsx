export interface IError {
  eid: string
  name: string
  message: string
  filename: string
  count: number
  last_seen: string
  status: 'active' | 'regressed' | 'fixed'
}

export interface IErrorDetails extends IError {
  colno: number
  lineno: number
  first_seen: string
}
