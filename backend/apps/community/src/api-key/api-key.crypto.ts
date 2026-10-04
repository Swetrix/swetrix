import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto'
import { deriveKey } from '../common/utils'

export const hashApiKey = (key: string) =>
  createHash('sha256').update(key).digest('hex')
export const generateApiKey = () => `swx_${randomBytes(32).toString('hex')}`
const encryptionKey = () => {
  if (!process.env.SECRET_KEY_BASE)
    throw new Error('SECRET_KEY_BASE is required')
  return Buffer.from(deriveKey('api-key', 32), 'hex')
}
export const encryptApiKey = (key: string, userId: string, id: string) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  cipher.setAAD(Buffer.from(`${userId}:${id}`))
  const encrypted = Buffer.concat([cipher.update(key, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted]
    .map((value) => value.toString('base64'))
    .join('.')
}
export const decryptApiKey = (value: string, userId: string, id: string) => {
  const [iv, tag, encrypted] = value
    .split('.')
    .map((part) => Buffer.from(part, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv)
  decipher.setAAD(Buffer.from(`${userId}:${id}`))
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8',
  )
}
