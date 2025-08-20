import Redis from 'ioredis'
import _toNumber from 'lodash/toNumber'

import { getSelfhostedUUID } from './utils'
import 'dotenv/config'

const redis = new Redis(
  _toNumber(process.env.REDIS_PORT),
  process.env.REDIS_HOST,
  {
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USER,
    family: 0,
  },
)

redis.defineCommand('countKeysByPattern', {
  numberOfKeys: 0,
  lua: "return #redis.call('keys', ARGV[1])",
})

const {
  JWT_ACCESS_TOKEN_SECRET,
  // 30 days
  JWT_REFRESH_TOKEN_LIFETIME = 60 * 60 * 24 * 30,
  // 30 minutes
  JWT_ACCESS_TOKEN_LIFETIME = 60 * 30,
} = process.env
const isProxiedByCloudflare = process.env.CLOUDFLARE_PROXY_ENABLED === 'true'
const isDevelopment = process.env.NODE_ENV === 'development'

const SELFHOSTED_EMAIL = process.env.EMAIL
const SELFHOSTED_PASSWORD = process.env.PASSWORD
const SELFHOSTED_API_KEY = process.env.API_KEY
const SELFHOSTED_API_AUTH_ENABLED = !!SELFHOSTED_API_KEY
const SELFHOSTED_GEOIP_DB_PATH = process.env.IP_GEOLOCATION_DB_PATH
const UUIDV5_NAMESPACE = '912c64c1-73fd-42b6-859f-785f839a9f68'
const DEFAULT_SELFHOSTED_UUID = 'deadbeef-dead-beef-dead-beefdeadbeef'

// OIDC configuration
const OIDC_ENABLED = process.env.OIDC_ENABLED === 'true'
const OIDC_ONLY_AUTH = process.env.OIDC_ONLY_AUTH === 'true'

const SELFHOSTED_UUID = getSelfhostedUUID()

const ORIGINS_REGEX =
  /^(?=.{1,255}$)([0-9A-Za-z*:](?:(?:[0-9A-Za-z*:]|-){0,61}[0-9A-Za-z*:])?(?:\.[0-9A-Za-z*:](?:(?:[0-9A-Za-z*-]|-){0,61}[0-9A-Za-z*:])?)*)?$/
const IP_REGEX =
  /^(([12]?[0-9]{1,2}|2[0-4][0-9]|25[0-5])(\.|\/)){4}([1-2]?[0-9]|3[0-2])$/
const PID_REGEX = /^(?!.*--)[a-zA-Z0-9-]{12}$/
const isValidPID = (pid: string) => PID_REGEX.test(pid)

// redis keys
const getRedisProjectKey = (pid: string) => `pid_${pid}`

const REDIS_SESSION_SALT_KEY = 'log_salt' // is updated every 24 hours
const REDIS_USERS_COUNT_KEY = 'stats:users_count'
const REDIS_PROJECTS_COUNT_KEY = 'stats:projects_count'
const REDIS_OIDC_SESSION_KEY = 'oidc:session'

// 3600 sec -> 1 hour
const redisProjectCacheTimeout = 3600

// 30 minues -> the amount of time analytics requests within one session are counted as non-unique
const UNIQUE_SESSION_LIFE_TIME = 1800

// Funnels
const MIN_PAGES_IN_FUNNEL = 2
const MAX_PAGES_IN_FUNNEL = 10

const TRAFFIC_COLUMNS = [
  'cc',
  'rg',
  'ct',
  'host',
  'pg',
  'lc',
  'br',
  'brv',
  'os',
  'osv',
  'dv',
  'ref',
  'so',
  'me',
  'ca',
  'te',
  'co',
]

const TRAFFIC_METAKEY_COLUMNS = ['tag:key', 'tag:value']

const ERROR_COLUMNS = [
  'host',
  'pg',
  'dv',
  'br',
  'brv',
  'os',
  'osv',
  'lc',
  'cc',
  'rg',
  'ct',
]

const ALL_COLUMNS = [...TRAFFIC_COLUMNS, 'ev', 'entryPage', 'exitPage']

const PERFORMANCE_COLUMNS = ['cc', 'rg', 'ct', 'host', 'pg', 'dv', 'br', 'brv']

const NUMBER_JWT_REFRESH_TOKEN_LIFETIME = Number(JWT_REFRESH_TOKEN_LIFETIME)
const NUMBER_JWT_ACCESS_TOKEN_LIFETIME = Number(JWT_ACCESS_TOKEN_LIFETIME)

export {
  redis,
  isValidPID,
  getRedisProjectKey,
  redisProjectCacheTimeout,
  UNIQUE_SESSION_LIFE_TIME,
  TRAFFIC_METAKEY_COLUMNS,
  REDIS_SESSION_SALT_KEY,
  UUIDV5_NAMESPACE,
  SELFHOSTED_EMAIL,
  SELFHOSTED_PASSWORD,
  SELFHOSTED_API_KEY,
  SELFHOSTED_API_AUTH_ENABLED,
  SELFHOSTED_UUID,
  REDIS_USERS_COUNT_KEY,
  REDIS_PROJECTS_COUNT_KEY,
  IP_REGEX,
  ORIGINS_REGEX,
  isDevelopment,
  DEFAULT_SELFHOSTED_UUID,
  JWT_ACCESS_TOKEN_SECRET,
  NUMBER_JWT_REFRESH_TOKEN_LIFETIME as JWT_REFRESH_TOKEN_LIFETIME,
  NUMBER_JWT_ACCESS_TOKEN_LIFETIME as JWT_ACCESS_TOKEN_LIFETIME,
  TRAFFIC_COLUMNS,
  PERFORMANCE_COLUMNS,
  isProxiedByCloudflare,
  MIN_PAGES_IN_FUNNEL,
  MAX_PAGES_IN_FUNNEL,
  ERROR_COLUMNS,
  PID_REGEX,
  ALL_COLUMNS,
  SELFHOSTED_GEOIP_DB_PATH,
  OIDC_ENABLED,
  OIDC_ONLY_AUTH,
  REDIS_OIDC_SESSION_KEY,
}
