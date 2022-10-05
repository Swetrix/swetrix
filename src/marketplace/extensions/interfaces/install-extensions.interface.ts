import { Category } from 'src/marketplace/categories/category.entity'

export interface installExtensionsInterfaces {
  id: string
  active: boolean
  name?: string
  description?: string | null
  version?: string
  price?: number
  mainImage?: string | null
  additionalImages?: string[] | []
  categories?: Category[]
  installs?: number
  projects?: string[] | null
}
