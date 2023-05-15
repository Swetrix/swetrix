import { User } from 'src/user/entities/user.entity'
import { Category } from '../../categories/category.entity'
import { ExtensionStatus } from '../enums/extension-status.enum'

export interface ICreateExtension {
  name: string
  description?: string | null
  version: string
  owner: User
  price?: number
  mainImage?: string | null
  additionalImages?: string[] | []
  status?: ExtensionStatus
  fileURL?: string
  category?: Category
}
