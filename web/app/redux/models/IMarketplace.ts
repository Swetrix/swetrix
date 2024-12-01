import { IProject } from "./IProject"
import { IUser } from "./IUser"

export enum ISortByConstans {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum IExtensionStatus {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
  NO_EXTENSION_UPLOADED = 'NO_EXTENSION_UPLOADED',
}

export enum IExtensionVersionType {
  MAJOR = 'major',
  MINOR = 'minor',
  PATCH = 'patch',
}

export type IExtension = {
  id: string
  owner: IUser
  name: string
  description: string | null
  version: string
  status: IExtensionStatus
  price: number
  mainImage: string | null
  additionalImages: string[] | []
  fileURL: string | null
  companyLink: string | null
  createdAt: Date
  updatedAt: Date
  category: ICategory
  projects: IProject[]
  comments: IComment[]
  tags: string[]
}

export type ICategory = {
  id: number
  name: string
}

export type IComment = {
  id: string
  extensionId: string
  userId: string
  text: string | null
  rating: number | null
  addedAt: Date
  replies: ICommentReply[]
}

export type ICommentReply = {
  id: string
  parentCommentId: string
  userId: string
  text: string
  addedAt: Date
  parentComment: IComment
  user: IUser
}
