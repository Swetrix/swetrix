export type CreateExtensionFilesType = {
  mainImage?: Express.Multer.File[]
  additionalImages?: Express.Multer.File[]
  extensionScript?: Express.Multer.File[]
}

export type CreateExtensionType = {
  ownerId: string
  name: string
  description?: string
  price?: number
  files: CreateExtensionFilesType
}
