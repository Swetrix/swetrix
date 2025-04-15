import { type Express } from 'express'
import { ExtensionVersionType } from '../dtos'

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
