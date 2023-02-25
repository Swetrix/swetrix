import { Extension } from '../entities/extension.entity'

export type CreateExtensionType = Pick<Extension, 'ownerId' | 'name'> &
  Partial<Pick<Extension, 'description' | 'price'>>
