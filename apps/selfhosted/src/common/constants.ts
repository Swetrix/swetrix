import { ClickHouse } from 'clickhouse'
import Redis from 'ioredis'
import * as _toNumber from 'lodash/toNumber'

import { getSelfhostedUUID } from './utils'

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()

const { CLICKHOUSE_DATABASE } = process.env

const redis = new Redis(
  _toNumber(process.env.REDIS_PORT),
  process.env.REDIS_HOST,
  {
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USER,
  },
)

redis.defineCommand('countKeysByPattern', {
  numberOfKeys: 0,
  lua: "return #redis.call('keys', ARGV[1])",
})

const clickhouse = new ClickHouse({
  url: process.env.CLICKHOUSE_HOST,
  port: _toNumber(process.env.CLICKHOUSE_PORT),
  debug: false,
  basicAuth: {
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD,
  },
  isUseGzip: false,
  format: 'json',
  raw: false,
  config: {
    session_timeout: 60,
    output_format_json_quote_64bit_integers: 0,
    enable_http_compression: 0,
    database: CLICKHOUSE_DATABASE,
    log_queries: 0,
  },
})

const { JWT_ACCESS_TOKEN_SECRET } = process.env
const isDevelopment = process.env.NODE_ENV === 'development'

const SELFHOSTED_EMAIL = process.env.EMAIL
const SELFHOSTED_PASSWORD = process.env.PASSWORD
const UUIDV5_NAMESPACE = '912c64c1-73fd-42b6-859f-785f839a9f68'
const DEFAULT_SELFHOSTED_UUID = 'deadbeef-dead-beef-dead-beefdeadbeef'

const SELFHOSTED_UUID = getSelfhostedUUID()

const ORIGINS_REGEX =
  /^(?=.{1,255}$)[0-9A-Za-z:](?:(?:[0-9A-Za-z:]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z:](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/
const IP_REGEX =
  /^(([12]?[0-9]{1,2}|2[0-4][0-9]|25[0-5])(\.|\/)){4}([1-2]?[0-9]|3[0-2])$/
const PID_REGEX = /^(?!.*--)[a-zA-Z0-9-]{12}$/
const isValidPID = (pid: string) => PID_REGEX.test(pid)

// redis keys
const getRedisProjectKey = (pid: string) => `pid_${pid}`

const REDIS_LOG_DATA_CACHE_KEY = 'log_cache'
const REDIS_LOG_CAPTCHA_CACHE_KEY = 'log:captcha'
const REDIS_LOG_PERF_CACHE_KEY = 'perf_cache'
const REDIS_LOG_CUSTOM_CACHE_KEY = 'log_custom_cache_v2'
const REDIS_SESSION_SALT_KEY = 'log_salt' // is updated every 24 hours
const REDIS_USERS_COUNT_KEY = 'stats:users_count'
const REDIS_PROJECTS_COUNT_KEY = 'stats:projects_count'
const REDIS_PAGEVIEWS_COUNT_KEY = 'stats:pageviews'
const REDIS_PERFORMANCE_COUNT_KEY = 'stats:performance'

// 3600 sec -> 1 hour
const redisProjectCacheTimeout = 3600

// 30 minues -> the amount of time analytics requests within one session are counted as non-unique
const UNIQUE_SESSION_LIFE_TIME = 1800

// 35 seconds
const HEARTBEAT_SID_LIFE_TIME = 35

export {
  clickhouse,
  redis,
  isValidPID,
  getRedisProjectKey,
  redisProjectCacheTimeout,
  UNIQUE_SESSION_LIFE_TIME,
  REDIS_LOG_DATA_CACHE_KEY,
  REDIS_LOG_CAPTCHA_CACHE_KEY,
  REDIS_LOG_CUSTOM_CACHE_KEY,
  REDIS_SESSION_SALT_KEY,
  HEARTBEAT_SID_LIFE_TIME,
  UUIDV5_NAMESPACE,
  SELFHOSTED_EMAIL,
  SELFHOSTED_PASSWORD,
  SELFHOSTED_UUID,
  REDIS_USERS_COUNT_KEY,
  REDIS_PROJECTS_COUNT_KEY,
  REDIS_PAGEVIEWS_COUNT_KEY,
  IP_REGEX,
  ORIGINS_REGEX,
  REDIS_LOG_PERF_CACHE_KEY,
  REDIS_PERFORMANCE_COUNT_KEY,
  isDevelopment,
  DEFAULT_SELFHOSTED_UUID,
  JWT_ACCESS_TOKEN_SECRET,
}
