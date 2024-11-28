import { api } from 'api'
import Debug from 'debug'
import _isEmpty from 'lodash/isEmpty'
import { IComment, ISortByConstans } from 'redux/models/IMarketplace'

const debug = Debug('swetrix:marketplace')

export const getExtensions = (limit = 0, offset = 0) =>
  api
    .get(`/extensions?limit=${limit}&offset=${offset}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getInstallExtensions = (limit = 0, offset = 0) =>
  api
    .get(`/extensions/installed?limit=${limit}&offset=${offset}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getPublishExtensions = (limit = 0, offset = 0) =>
  api
    .get(`/extensions/published?limit=${limit}&offset=${offset}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export type CreateExtensionType = {
  name: string
  description?: string
  price?: string
  categoryId?: string
  companyLink?: string
  mainImage?: Blob
  additionalImages?: Blob[]
  extensionScript?: Blob
}

export const createExtension = (data: CreateExtensionType) =>
  api
    .post('/extensions', data)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateExtension = (id: string, data: CreateExtensionType) =>
  api
    .patch(`/extensions/${id}`, data)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteExtension = (id: string) =>
  api
    .delete(`/extensions/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getExtensionsSearch = (term: string, category: string, sortBy: ISortByConstans, offset = 0, limit = 25) =>
  api
    .get(`/extensions/search?term=${term}&category=${category}&sortBy=${sortBy}&offset=${offset}&limit=${limit}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getCategories = () =>
  api
    .get('/categories')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const installExtension = (extensionId: string, projectId: string = '') =>
  api
    .post(`/extensions/${extensionId}/install`, { projectId })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteInstallExtension = (extensionId: string) =>
  api
    .delete(`/extensions/${extensionId}/uninstall`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const createComment = (userId: string, comment: IComment) =>
  api
    .post(`/comments?userId=${userId}`, comment)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const replyToComment = (commentId: string, text: string) =>
  api
    .post(`/comments/reply`, { commentId, text })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateReply = (replyId: string, text: string) =>
  api
    .put(`/comments/reply/${replyId}`, { text })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteReply = (replyId: string) =>
  api
    .delete(`/comments/reply/${replyId}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getComments = (extensionId: string, limit: number, offset: number) =>
  api
    .get(`/comments?offset=${offset}&limit=${limit}&extensionId=${extensionId}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getCommentById = (commentId: string) =>
  api
    .get(`/comments/${commentId}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteComment = (commentId: string) =>
  api
    .delete(`/comments/${commentId}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })
