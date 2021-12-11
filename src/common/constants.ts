import { ClickHouse } from 'clickhouse'
import Redis from 'ioredis'
import * as _toNumber from 'lodash/toNumber'
import * as _size from 'lodash/size'
import * as _round from 'lodash/round'

require('dotenv').config()

const redis = new Redis({
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST,
})

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
    session_id: 'nestjsAPIapp',
    session_timeout: 60,
    output_format_json_quote_64bit_integers: 0,
    enable_http_compression: 0,
    database: process.env.CLICKHOUSE_DATABASE,
  },
})

const isSelfhosted = process.env.SELFHOSTED

/**
 * Calculates in percent, the change between 2 numbers.
 * e.g from 1000 to 500 = 50%
 * 
 * @param oldVal The initial value
 * @param newVal The value that changed
 */
function getPercentageChange(oldVal: number, newVal: number, round: number = 2) {
  if (oldVal === 0) {
    if (newVal === 0) {
      return 0
    } else {
      return _round(-100 * newVal, round)
    }
  }

  const decrease = oldVal - newVal
  return _round((decrease / oldVal) * 100, round)
}

const JWT_LIFE_TIME = 7 * 24 * 60 * 60
const HISTORY_LIFE_TIME_DAYS = 30

// is ProjectID a valid key
const isValidPID = (pid: string) => _size(pid) === 12

// redis keys
const getRedisProjectKey = (pid: string) => `pid_${pid}`
const getRedisUserCountKey = (uid: string) => `user_c_${uid}`

const REDIS_LOG_DATA_CACHE_KEY = 'log_cache'
const REDIS_LOG_CUSTOM_CACHE_KEY = 'log_custom_cache'
const REDIS_SESSION_SALT_KEY = 'log_salt' // is updated every 24 hours

// 3600 sec -> 1 hour
const redisProjectCacheTimeout = 3600

// 15 minutes
const redisProjectCountCacheTimeout = 900

// 30 minues -> the amount of time analytics requests within one session are counted as non-unique
const UNIQUE_SESSION_LIFE_TIME = 1800

// 35 seconds
const HEARTBEAT_SID_LIFE_TIME = 35

// how often can user request a fresh GDPR export of their data; in days.
const GDPR_EXPORT_TIMEFRAME = 14

const STRIPE_SECRET = process.env.STRIPE_SECRET
const STRIPE_WH_SECRET = process.env.STRIPE_WH_SECRET

export {
  clickhouse, JWT_LIFE_TIME, HISTORY_LIFE_TIME_DAYS, redis, isValidPID, getRedisProjectKey,
  redisProjectCacheTimeout, getPercentageChange, UNIQUE_SESSION_LIFE_TIME, REDIS_LOG_DATA_CACHE_KEY,
  GDPR_EXPORT_TIMEFRAME, getRedisUserCountKey, redisProjectCountCacheTimeout, REDIS_LOG_CUSTOM_CACHE_KEY,
  STRIPE_SECRET, STRIPE_WH_SECRET, REDIS_SESSION_SALT_KEY, HEARTBEAT_SID_LIFE_TIME, isSelfhosted,
}
