import { Category } from '../../categories/category.entity'

export interface ICreateExtension {
  name: string
  description?: string | null
  version: string
  price?: number
  mainImage?: string | null
  additionalImages?: string[] | []
  categories?: Category[]
}
