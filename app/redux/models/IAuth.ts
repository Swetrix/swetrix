import { IUser } from './IUser'

export interface IAuth {
  refresh_token: string
  access_token: string
  user: IUser
}
