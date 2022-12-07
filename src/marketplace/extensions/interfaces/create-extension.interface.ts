import { User } from 'src/user/entities/user.entity'
import { Category } from '../../categories/category.entity'

export interface ICreateExtension {
  name: string
  description?: string | null
  version: string
  owner: User
  price?: number
  mainImage?: string | null
  additionalImages?: string[] | []
  status?: string
  fileURL?: string
  category?: Category
}
