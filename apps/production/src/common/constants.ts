import Redis from 'ioredis'
import * as path from 'path'
import { hash } from 'blake3'
import * as _toNumber from 'lodash/toNumber'

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, EMAIL_ACTION_ENCRYPTION_KEY } =
  process.env

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
const isDevelopment = process.env.NODE_ENV === 'development'
const isProxiedByCloudflare = process.env.CLOUDFLARE_PROXY_ENABLED === 'true'
const PRODUCTION_ORIGIN = process.env.CLIENT_URL || 'https://swetrix.com'

const { TWO_FACTOR_AUTHENTICATION_APP_NAME } = process.env

const ORIGINS_REGEX =
  /^(?=.{1,255}$)([0-9A-Za-z*:](?:(?:[0-9A-Za-z*:]|-){0,61}[0-9A-Za-z*:])?(?:\.[0-9A-Za-z*:](?:(?:[0-9A-Za-z*-]|-){0,61}[0-9A-Za-z*:])?)*)?$/
const IP_REGEX =
  /^(([12]?[0-9]{1,2}|2[0-4][0-9]|25[0-5])(\.|\/)){4}([1-2]?[0-9]|3[0-2])$/
const PID_REGEX = /^(?!.*--)[a-zA-Z0-9-]{12}$/
const isValidPID = (pid: string) => PID_REGEX.test(pid)

// redis keys
const getRedisProjectKey = (pid: string) => `pid_${pid}`
const getRedisUserCountKey = (uid: string) => `user_c_${uid}`
const getRedisUserUsageInfoKey = (uid: string) => `user_ui_${uid}`
const getRedisCaptchaKey = (token: string) => `captcha_${hash(token)}`

const REDIS_SESSION_SALT_KEY = 'log_salt' // is updated every 24 hours
const REDIS_USERS_COUNT_KEY = 'stats:users_count'
const REDIS_PROJECTS_COUNT_KEY = 'stats:projects_count'
const REDIS_EVENTS_COUNT_KEY = 'stats:events'
const REDIS_SSO_UUID = 'sso:uuid'

// Captcha service
const { CAPTCHA_SALT } = process.env

// 3600 sec -> 1 hour
const redisProjectCacheTimeout = 3600

// 15 minutes
const redisProjectCountCacheTimeout = 900

// 5 minutes
const redisUserUsageinfoCacheTimeout = 300

// 30 minues -> the amount of time analytics requests within one session are counted as non-unique
const UNIQUE_SESSION_LIFE_TIME = 1800

// 35 seconds
const HEARTBEAT_SID_LIFE_TIME = 35

const AFFILIATE_CUT = 0.2

// how often can user request a fresh GDPR export of their data; in days.
const GDPR_EXPORT_TIMEFRAME = 14

// send email warning when 85% of events in tier are used
const SEND_WARNING_AT_PERC = 85

const PROJECT_INVITE_EXPIRE = 48

const CAPTCHA_TOKEN_LIFETIME = 300 // seconds (5 minutes).
const CAPTCHA_SECRET_KEY_LENGTH = 50

// Funnels
const MIN_PAGES_IN_FUNNEL = 2
const MAX_PAGES_IN_FUNNEL = 10

const TRAFFIC_SPIKE_ALLOWED_PERCENTAGE = 0.3

const BLOG_POSTS_ROOT = 'blog-posts/posts'

const BLOG_POSTS_PATH = isDevelopment
  ? path.join(__dirname, '../../../..', 'blog-posts', 'posts')
  : path.join(__dirname, '../..', 'blog-posts', 'posts')

const TRAFFIC_COLUMNS = [
  'cc',
  'rg',
  'ct',
  'pg',
  'lc',
  'br',
  'os',
  'dv',
  'ref',
  'so',
  'me',
  'ca',
]

const UPTIME_COLUMNS = ['region', 'statusCode']

const TRAFFIC_METAKEY_COLUMNS = ['tag:key', 'tag:value']

const ERROR_COLUMNS = ['pg', 'dv', 'br', 'os', 'lc', 'cc', 'rg', 'ct']

const ALL_COLUMNS = [...TRAFFIC_COLUMNS, 'ev']

const CAPTCHA_COLUMNS = ['cc', 'br', 'os', 'dv']
const PERFORMANCE_COLUMNS = ['cc', 'rg', 'ct', 'pg', 'dv', 'br']

const sentryIgnoreErrors: (string | RegExp)[] = [
  'BadRequestException',
  'UnauthorizedException',
  'PaymentRequiredException',
  'ForbiddenException',
  'NotFoundException',
  'MethodNotAllowedException',
  'NotAcceptableException',
  'ProxyAuthenticationRequiredException',
  'RequestTimeoutException',
  'ConflictException',
  'GoneException',
  'LengthRequiredException',
  'PreconditionFailedException',
  'PayloadTooLargeException',
  'URITooLongException',
  'UnsupportedMediaTypeException',
  'RangeNotSatisfiableException',
  'ExpectationFailedException',
  'ImATeapotException',
  'MisdirectedRequestException',
  'UnprocessableEntityException',
  'LockedException',
  'FailedDependencyException',
  'TooEarlyException',
  'UpgradeRequiredException',
  'PreconditionRequiredException',
  'TooManyRequestsException',
  'RequestHeaderFieldsTooLargeException',
  'UnavailableForLegalReasonsException',
  'ClientClosedRequestException',
  'HttpException', // at the moment, these are either rate-limiting or payment required errors, so no need to track them
]

const NUMBER_JWT_REFRESH_TOKEN_LIFETIME = Number(JWT_REFRESH_TOKEN_LIFETIME)
const NUMBER_JWT_ACCESS_TOKEN_LIFETIME = Number(JWT_ACCESS_TOKEN_LIFETIME)

const MAX_FUNNELS = 100

export {
  redis,
  isValidPID,
  getRedisProjectKey,
  redisProjectCacheTimeout,
  UNIQUE_SESSION_LIFE_TIME,
  GDPR_EXPORT_TIMEFRAME,
  getRedisUserCountKey,
  redisProjectCountCacheTimeout,
  REDIS_SESSION_SALT_KEY,
  HEARTBEAT_SID_LIFE_TIME,
  REDIS_USERS_COUNT_KEY,
  REDIS_PROJECTS_COUNT_KEY,
  REDIS_EVENTS_COUNT_KEY,
  SEND_WARNING_AT_PERC,
  PROJECT_INVITE_EXPIRE,
  TWO_FACTOR_AUTHENTICATION_APP_NAME,
  IP_REGEX,
  ORIGINS_REGEX,
  CAPTCHA_SALT,
  EMAIL_ACTION_ENCRYPTION_KEY,
  isDevelopment,
  getRedisCaptchaKey,
  CAPTCHA_TOKEN_LIFETIME,
  CAPTCHA_SECRET_KEY_LENGTH,
  PRODUCTION_ORIGIN,
  REDIS_SSO_UUID,
  JWT_ACCESS_TOKEN_SECRET,
  NUMBER_JWT_REFRESH_TOKEN_LIFETIME as JWT_REFRESH_TOKEN_LIFETIME,
  NUMBER_JWT_ACCESS_TOKEN_LIFETIME as JWT_ACCESS_TOKEN_LIFETIME,
  getRedisUserUsageInfoKey,
  redisUserUsageinfoCacheTimeout,
  TRAFFIC_COLUMNS,
  UPTIME_COLUMNS,
  TRAFFIC_METAKEY_COLUMNS,
  CAPTCHA_COLUMNS,
  ERROR_COLUMNS,
  PERFORMANCE_COLUMNS,
  sentryIgnoreErrors,
  isProxiedByCloudflare,
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  BLOG_POSTS_PATH,
  MIN_PAGES_IN_FUNNEL,
  MAX_PAGES_IN_FUNNEL,
  MAX_FUNNELS,
  ALL_COLUMNS,
  BLOG_POSTS_ROOT,
  TRAFFIC_SPIKE_ALLOWED_PERCENTAGE,
  AFFILIATE_CUT,
  PID_REGEX,
}
