import { AddSubscriberBodyDto, AddSubscriberParamsDto } from '../dto'

export type AddSubscriberType = { userId: string } & AddSubscriberParamsDto &
  AddSubscriberBodyDto & {
    origin: string
  }
