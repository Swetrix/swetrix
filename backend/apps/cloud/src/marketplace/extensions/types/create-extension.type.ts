import { type Express } from 'express'
import { type ExtensionVersionType } from '../dtos/create-extension.dto'

export type CreateExtensionType = {
  ownerId: string
  name: string
  description?: string
  price?: string
  categoryId?: string
  companyLink?: string
  mainImage?: Express.Multer.File
  additionalImages?: Express.Multer.File[]
  extensionScript?: Express.Multer.File
}

export type AdditionalExtensionInfo = {
  version: ExtensionVersionType
  additionalImagesToDelete: string[]
}
