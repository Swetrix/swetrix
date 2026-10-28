import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { deriveKey } from '../common/utils'

const encryptionKey = () => {
  if (!process.env.SECRET_KEY_BASE) {
    throw new Error('SECRET_KEY_BASE is required for warehouse credentials')
  }
  return Buffer.from(deriveKey('data-export', 32), 'hex')
}

export const encryptWarehouseCredentials = (
  credentials: string,
  projectId: string,
  connectionId: string,
) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  cipher.setAAD(Buffer.from(`${projectId}:${connectionId}`))
  const encrypted = Buffer.concat([
    cipher.update(credentials, 'utf8'),
    cipher.final(),
  ])
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString('base64'))
    .join('.')
}

export const decryptWarehouseCredentials = (
  credentials: string,
  projectId: string,
  connectionId: string,
) => {
  const parts = credentials.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid warehouse credential payload')
  }
  const [iv, tag, encrypted] = parts.map((part) => Buffer.from(part, 'base64'))
  if (tag.length !== 16) {
    throw new Error('Invalid warehouse credential authentication tag')
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv, {
    authTagLength: 16,
  })
  decipher.setAAD(Buffer.from(`${projectId}:${connectionId}`))
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8',
  )
}
