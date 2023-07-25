import { NotFoundException, HttpException } from '@nestjs/common'
import timezones from 'countries-and-timezones'
import { hash } from 'blake3'
import { v5 as uuidv5 } from 'uuid'
import * as _join from 'lodash/join'
import * as _filter from 'lodash/filter'
import * as _values from 'lodash/values'
import * as _reduce from 'lodash/reduce'
import * as _keys from 'lodash/keys'
import * as _toNumber from 'lodash/toNumber'
import * as _split from 'lodash/split'
import * as _isEmpty from 'lodash/isEmpty'
import * as _head from 'lodash/head'
import * as _round from 'lodash/round'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as _map from 'lodash/map'

import {
  clickhouse,
  redis,
  DEFAULT_SELFHOSTED_UUID,
  SELFHOSTED_EMAIL,
  UUIDV5_NAMESPACE,
  isDevelopment,
  isProxiedByCloudflare,
} from './constants'
import { Project } from '../project/entity/project.entity'

dayjs.extend(utc)

const RATE_LIMIT_REQUESTS_AMOUNT = 3
const RATE_LIMIT_TIMEOUT = 86400 // 24 hours

const allowedToUpdateKeys = [
  'name',
  'origins',
  'ipBlacklist',
  'active',
  'public',
]

const getRateLimitHash = (ipOrApiKey: string, salt = '') =>
  `rl:${hash(`${ipOrApiKey}${salt}`).toString('hex')}`

// 'action' is used as a salt to differ rate limiting routes
const checkRateLimit = async (
  ip: string,
  action: string,
  reqAmount: number = RATE_LIMIT_REQUESTS_AMOUNT,
  reqTimeout: number = RATE_LIMIT_TIMEOUT,
): Promise<void> => {
  if (isDevelopment) {
    return
  }

  const rlHash = getRateLimitHash(ip, action)
  const rlCount: number = _toNumber(await redis.get(rlHash)) || 0

  if (rlCount >= reqAmount) {
    throw new HttpException('Too many requests, please try again later', 429)
  }
  await redis.set(rlHash, 1 + rlCount, 'EX', reqTimeout)
}

const getProjectsClickhouse = async (id = null) => {
  if (!id) {
    const query = 'SELECT * FROM project;'
    return clickhouse.query(query).toPromise()
  }

  const paramsData = {
    params: {
      id,
    },
  }

  const query = `SELECT * FROM project WHERE id = {id:FixedString(12)};`
  const project = await clickhouse.query(query, paramsData).toPromise()

  if (_isEmpty(project)) {
    throw new NotFoundException(`Project ${id} was not found in the database`)
  }

  return _head(project)
}

const updateProjectClickhouse = async (project: object) => {
  const filtered = _reduce(
    _filter(_keys(project), key => allowedToUpdateKeys.includes(key)),
    (obj, key) => {
      obj[key] = project[key]
      return obj
    },
    {},
  )
  const columns = _keys(filtered)
  const values = _values(filtered)
  // @ts-ignore
  const query = `ALTER table project UPDATE ${_join(
    _map(columns, (col, id) => `${col}='${values[id]}'`),
    ', ',
    // @ts-ignore
  )} WHERE id='${project.id}'`
  return clickhouse.query(query).toPromise()
}

/**
 * Checking the % change in one number relative to the other
 * @param oldVal The initial value
 * @param newVal The value that changed
 * @param round Numbers after floating point
 */
const calculateRelativePercentage = (
  oldVal: number,
  newVal: number,
  round = 2,
) => {
  if (oldVal === newVal) return 0
  if (oldVal === 0) return 100
  if (newVal === 0) return -100

  if (newVal > oldVal) {
    return _round((newVal / oldVal) * 100, round)
  }

  return _round((1 - newVal / oldVal) * -100, round)
}

const deleteProjectClickhouse = async id => {
  const query = `ALTER table project DELETE WHERE id='${id}'`
  return clickhouse.query(query).toPromise()
}

const createProjectClickhouse = async (project: Partial<Project>) => {
  const paramsData = {
    params: {
      ...project,
    },
  }
  const query = `INSERT INTO project (*) VALUES ({id:FixedString(12)},{name:String},'', '',1,0,'${dayjs
    .utc()
    .format('YYYY-MM-DD HH:mm:ss')}')`
  return clickhouse.query(query, paramsData).toPromise()
}

const saveRefreshTokenClickhouse = async (
  userId: string,
  refreshToken: string,
) => {
  const paramsData = {
    params: {
      userId,
      refreshToken,
    },
  }
  const query =
    'INSERT INTO refresh_token (*) VALUES ({userId:String},{refreshToken:String})'

  return clickhouse.query(query, paramsData).toPromise()
}

const findRefreshTokenClickhouse = async (
  userId: string,
  refreshToken: string,
) => {
  const paramsData = {
    params: {
      userId,
      refreshToken,
    },
  }
  const query =
    'SELECT * FROM refresh_token WHERE userId = {userId:String} AND refreshToken = {refreshToken:String}'
  return clickhouse.query(query, paramsData).toPromise()
}

const deleteRefreshTokenClickhouse = async (
  userId: string,
  refreshToken: string,
) => {
  const paramsData = {
    params: {
      userId,
      refreshToken,
    },
  }
  const query = `ALTER table refresh_token DELETE WHERE userId = {userId:String} AND refreshToken = {refreshToken:String}`
  return clickhouse.query(query, paramsData).toPromise()
}

interface IClickhouseUser {
  timezone?: string
  timeFormat?: string
  showLiveVisitorsInTitle?: number
}

const CLICKHOUSE_SETTINGS_ID = 'sfuser'

const createUserClickhouse = async (user: IClickhouseUser) => {
  const paramsData = {
    params: {
      ...user,
      id: CLICKHOUSE_SETTINGS_ID,
    },
  }

  const query = `INSERT INTO sfuser (*) VALUES ({id:String},{timezone:String},{timeFormat:String},{showLiveVisitorsInTitle:Int8})`

  return clickhouse.query(query, paramsData).toPromise()
}

const getUserClickhouse = async () => {
  const paramsData = {
    params: {
      id: CLICKHOUSE_SETTINGS_ID,
    },
  }

  const query = `SELECT * FROM sfuser WHERE id = {id:String}`

  try {
    return (await clickhouse.query(query, paramsData).toPromise())[0] || {}
  } catch {
    return {}
  }
}

const userClickhouseExists = async () => {
  const query = `SELECT * FROM sfuser WHERE id = '${CLICKHOUSE_SETTINGS_ID}'`

  try {
    const result = await clickhouse.query(query).toPromise()
    return !_isEmpty(result)
  } catch {
    return false
  }
}

const updateUserClickhouse = async (user: IClickhouseUser) => {
  const userExists = await userClickhouseExists()

  if (!userExists) {
    await createUserClickhouse(user)
  }

  const paramsData = {
    params: {
      ...user,
      id: CLICKHOUSE_SETTINGS_ID,
    },
  }

  let query = 'ALTER table sfuser UPDATE '
  let separator = ''

  if (user.timezone) {
    query += `${separator}timezone={timezone:String}`
    separator = ', '
  }

  if (user.timeFormat) {
    query += `${separator}timeFormat={timeFormat:String}`
    separator = ', '
  }

  if (user.showLiveVisitorsInTitle) {
    query += `${separator}showLiveVisitorsInTitle={showLiveVisitorsInTitle:Int8}`
    separator = ', '
  }

  query += ` WHERE id={id:String}`

  return clickhouse.query(query, paramsData).toPromise()
}

const millisecondsToSeconds = (milliseconds: number) => milliseconds / 1000

const getSelfhostedUUID = (): string => {
  try {
    return uuidv5(SELFHOSTED_EMAIL, UUIDV5_NAMESPACE)
  } catch {
    return DEFAULT_SELFHOSTED_UUID
  }
}

interface IPGeoDetails {
  country?: string
  region?: string
  city?: string
}

const getGeoDetails = (
  ip: string,
  tz?: string,
  headers?: unknown,
): IPGeoDetails => {
  // TODO: Add support for DBIP for self-hosted

  // Stage 1: Using IP address based geo lookup
  // const data = lookup.get(ip)

  // const country = data?.country?.iso_code
  // // TODO: Add city overrides, for example, Colinton -> Edinburgh, etc.
  // const city = data?.city?.names?.en
  // const region = data?.subdivisions?.[0]?.names?.en

  // if (country) {
  //   return {
  //     country,
  //     city,
  //     region,
  //   }
  // }

  // Stage 2: If Cloudflare is enabled, use their headers
  if (isProxiedByCloudflare && headers?.['cf-ipcountry'] !== 'XX') {
    return headers['cf-ipcountry']
  }

  // Stage 3: Using timezone based geo lookup as a fallback
  const tzCountry = timezones.getCountryForTimezone(tz)?.id || null

  return {
    country: tzCountry,
    city: null,
    region: null,
  }
}

const getIPFromHeaders = (headers: any) => {
  if (isProxiedByCloudflare && headers['cf-connecting-ip']) {
    return headers['cf-connecting-ip']
  }

  // Get IP based on the NGINX configuration
  let ip = headers['x-real-ip']

  if (ip) {
    return ip
  }

  ip = headers['x-forwarded-for'] || null

  if (!ip) {
    return null
  }

  return _split(ip, ',')[0]
}

export {
  checkRateLimit,
  createProjectClickhouse,
  getProjectsClickhouse,
  updateProjectClickhouse,
  deleteProjectClickhouse,
  calculateRelativePercentage,
  millisecondsToSeconds,
  getSelfhostedUUID,
  saveRefreshTokenClickhouse,
  findRefreshTokenClickhouse,
  deleteRefreshTokenClickhouse,
  updateUserClickhouse,
  getUserClickhouse,
  createUserClickhouse,
  getGeoDetails,
  getIPFromHeaders,
}
