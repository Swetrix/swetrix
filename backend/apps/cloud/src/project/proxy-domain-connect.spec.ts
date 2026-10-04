import { Logger } from '@nestjs/common'
import { generateKeyPairSync, verify } from 'crypto'
import { ProxyDomainConnectService } from './proxy-domain-connect.service'
import template from '../../../../domain-connect/swetrix.com.managed-proxy.json'

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
const pem = keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const targetId = '0123456789abcdef0123456789abcdef'
const originalEnv = process.env

beforeEach(() => {
  process.env = {
    ...originalEnv,
    CLIENT_URL: 'https://swetrix.com',
    MANAGED_PROXY_BASE_DOMAIN: 'proxy.swetrix.org',
    MANAGED_PROXY_DOMAIN_CONNECT_ENABLED: 'true',
    MANAGED_PROXY_DOMAIN_CONNECT_KEY_ID: '_dcpubkeyv1',
    MANAGED_PROXY_DOMAIN_CONNECT_PRIVATE_KEY: pem,
  }
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  process.env = originalEnv
  jest.restoreAllMocks()
})

it('signs only the encoded query, excluding key and sig, and rejects tampering', () => {
  const service = new ProxyDomainConnectService()
  const url = new URL(
    service.createUrl('project-id', 't.example.com', targetId),
  )
  expect(service.enabled).toBe(true)
  expect(url.origin).toBe('https://dash.cloudflare.com')
  expect(url.pathname).toBe(
    `/domainconnect/v2/domainTemplates/providers/${template.providerId}/services/${template.serviceId}/apply`,
  )
  const query = url.search.slice(1).split('&key=')[0]
  const signature = Buffer.from(url.searchParams.get('sig'), 'base64')
  expect(
    verify('RSA-SHA256', Buffer.from(query), keys.publicKey, signature),
  ).toBe(true)
  expect(
    verify(
      'RSA-SHA256',
      Buffer.from(query.replace('host=t&', 'host=www&')),
      keys.publicKey,
      signature,
    ),
  ).toBe(false)
  expect([...url.searchParams.keys()].slice(-2)).toEqual(['key', 'sig'])
  expect(url.searchParams.get('proxyTargetId')).toBe(targetId)
  expect(
    template.records[0].pointsTo.replace('%proxyTargetId%', targetId),
  ).toBe(`${targetId}.proxy.swetrix.org`)
  const redirect = new URL(url.searchParams.get('redirect_uri'))
  expect(redirect.origin).toBe('https://swetrix.com')
  expect(redirect.pathname).toBe('/projects/settings/project-id')
  expect(redirect.searchParams.get('tab')).toBe('proxy')
  expect(redirect.searchParams.get('cloudflare')).toBe('t.example.com')
})

it('keeps nested hosts intact under multi-label public suffixes', () => {
  const url = new URL(
    new ProxyDomainConnectService().createUrl(
      'pid',
      't.shop.example.co.uk',
      targetId,
    ),
  )
  expect(url.searchParams.get('domain')).toBe('example.co.uk')
  expect(url.searchParams.get('host')).toBe('t.shop')
})

it('accepts escaped newlines in the private key', () => {
  process.env.MANAGED_PROXY_DOMAIN_CONNECT_PRIVATE_KEY = pem.replace(
    /\n/g,
    '\\n',
  )
  expect(new ProxyDomainConnectService().enabled).toBe(true)
})

it.each([
  ['MANAGED_PROXY_DOMAIN_CONNECT_ENABLED', 'false'],
  ['MANAGED_PROXY_DOMAIN_CONNECT_PRIVATE_KEY', ''],
  ['MANAGED_PROXY_DOMAIN_CONNECT_PRIVATE_KEY', 'invalid'],
  ['MANAGED_PROXY_DOMAIN_CONNECT_KEY_ID', ''],
  ['MANAGED_PROXY_DOMAIN_CONNECT_KEY_ID', '../invalid'],
  ['MANAGED_PROXY_BASE_DOMAIN', 'other.example.com'],
  ['CLIENT_URL', 'http://swetrix.com'],
])('disables setup for invalid configuration: %s', (name, value) => {
  process.env[name] = value
  const service = new ProxyDomainConnectService()
  expect(service.enabled).toBe(false)
  expect(() => service.createUrl('pid', 't.example.com', targetId)).toThrow(
    'Cloudflare DNS setup is unavailable',
  )
})

it('rejects non-RSA keys', () => {
  process.env.MANAGED_PROXY_DOMAIN_CONNECT_PRIVATE_KEY = generateKeyPairSync(
    'ec',
    { namedCurve: 'P-256' },
  )
    .privateKey.export({ type: 'pkcs8', format: 'pem' })
    .toString()
  expect(new ProxyDomainConnectService().enabled).toBe(false)
})

it('rejects apex domains and target substitution', () => {
  const service = new ProxyDomainConnectService()
  expect(() => service.createUrl('pid', 'example.co.uk', targetId)).toThrow(
    'Invalid managed proxy domain',
  )
  expect(() =>
    service.createUrl('pid', 't.example.com', 'evil.example.com'),
  ).toThrow('Invalid managed proxy domain')
})
