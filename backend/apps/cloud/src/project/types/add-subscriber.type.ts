import {
  AddSubscriberBodyDto,
  AddSubscriberParamsDto,
  AddSubscriberMetaParamsDTO,
} from '../dto'

export type AddSubscriberType = { userId: string } & AddSubscriberParamsDto &
  AddSubscriberMetaParamsDTO &
  AddSubscriberBodyDto & {
    origin: string
  }
