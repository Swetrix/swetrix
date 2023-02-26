import { AdditionalExtensionInfo } from '../dtos'
import { CreateExtensionType } from './create-extension.type'

export type UpdateExtensionType = Partial<CreateExtensionType> &
  Partial<AdditionalExtensionInfo>
