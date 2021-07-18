import { ClickHouse } from 'clickhouse'
import Redis from 'ioredis'
import * as _toNumber from 'lodash/toNumber'
import * as _size from 'lodash/size'
require('dotenv').config()

const redis = new Redis({
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST,
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

const JWT_LIFE_TIME = 7 * 24 * 60 * 60
const HISTORY_LIFE_TIME_DAYS = 30

// is ProjectID a valid key
const isValidPID = (pid: string) => _size(pid) === 12

// redis keys
const getRedisProjectKey = (pid: string) => `pid_${pid}`

// 3600 sec -> 1 hour
const redisProjectCacheTimeout = 3600

export {
  clickhouse, JWT_LIFE_TIME, HISTORY_LIFE_TIME_DAYS, redis, isValidPID, getRedisProjectKey,
  redisProjectCacheTimeout,
}
