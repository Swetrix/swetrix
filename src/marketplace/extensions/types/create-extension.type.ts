export type CreateExtensionType = {
  ownerId: string
  name: string
  description?: string
  price?: string
  mainImage?: Express.Multer.File
  additionalImages?: Express.Multer.File[]
  extensionScript?: Express.Multer.File
}
