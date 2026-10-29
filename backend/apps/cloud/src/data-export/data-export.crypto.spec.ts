jest.mock('../common/utils', () => ({
  deriveKey: (purpose: string, length: number) =>
    Buffer.from(
      require('crypto').hkdfSync(
        'sha256',
        process.env.SECRET_KEY_BASE,
        Buffer.alloc(0),
        purpose,
        length,
      ),
    ).toString('hex'),
}))

import {
  decryptWarehouseCredentials,
  encryptWarehouseCredentials,
} from './data-export.crypto'

describe('warehouse credential storage', () => {
  const originalKey = process.env.SECRET_KEY_BASE
  beforeEach(() => {
    process.env.SECRET_KEY_BASE = 'a-test-secret-key'
  })
  afterEach(() => {
    if (originalKey === undefined) delete process.env.SECRET_KEY_BASE
    else process.env.SECRET_KEY_BASE = originalKey
  })

  it('encrypts with random IVs and binds ciphertext to project and connection', () => {
    const first = encryptWarehouseCredentials(
      'private-key',
      'project',
      'connection',
    )
    expect(first).not.toContain('private-key')
    expect(
      encryptWarehouseCredentials('private-key', 'project', 'connection'),
    ).not.toBe(first)
    expect(decryptWarehouseCredentials(first, 'project', 'connection')).toBe(
      'private-key',
    )
    expect(() =>
      decryptWarehouseCredentials(first, 'another-project', 'connection'),
    ).toThrow()
    expect(() =>
      decryptWarehouseCredentials(first, 'project', 'another-connection'),
    ).toThrow()
  })

  it('rejects tampered ciphertext and missing or changed encryption keys', () => {
    const encrypted = encryptWarehouseCredentials(
      'private-key',
      'project',
      'connection',
    )
    const parts = encrypted.split('.')
    const bytes = Buffer.from(parts[2], 'base64')
    bytes[0] ^= 1
    parts[2] = bytes.toString('base64')
    expect(() =>
      decryptWarehouseCredentials(parts.join('.'), 'project', 'connection'),
    ).toThrow()
    process.env.SECRET_KEY_BASE = 'changed-key'
    expect(() =>
      decryptWarehouseCredentials(encrypted, 'project', 'connection'),
    ).toThrow()
    delete process.env.SECRET_KEY_BASE
    expect(() =>
      encryptWarehouseCredentials('key', 'project', 'connection'),
    ).toThrow('SECRET_KEY_BASE')
  })

  it.each([0, 1, 2, 4])('rejects payloads with %i parts', (count) => {
    const parts = encryptWarehouseCredentials(
      'private-key',
      'project',
      'connection',
    ).split('.')
    const payload = [...parts, 'extra'].slice(0, count).join('.')
    expect(() =>
      decryptWarehouseCredentials(payload, 'project', 'connection'),
    ).toThrow()
  })

  it.each([0, 4, 8, 12, 15, 17])(
    'rejects %i-byte authentication tags',
    (length) => {
      const parts = encryptWarehouseCredentials(
        'private-key',
        'project',
        'connection',
      ).split('.')
      const tag = Buffer.from(parts[1], 'base64')
      parts[1] = Buffer.concat([tag, Buffer.alloc(1)])
        .subarray(0, length)
        .toString('base64')
      expect(() =>
        decryptWarehouseCredentials(parts.join('.'), 'project', 'connection'),
      ).toThrow()
    },
  )
})
