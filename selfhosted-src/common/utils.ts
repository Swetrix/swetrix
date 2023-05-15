import { NotFoundException, HttpException } from '@nestjs/common'
import { hash } from 'blake3'
import { v5 as uuidv5 } from 'uuid'
import * as randomstring from 'randomstring'
import * as _sample from 'lodash/sample'
import * as _join from 'lodash/join'
import * as _filter from 'lodash/filter'
import * as _values from 'lodash/values'
import * as _reduce from 'lodash/reduce'
import * as _keys from 'lodash/keys'
import * as _toNumber from 'lodash/toNumber'
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

const RATE_LIMIT_FOR_API_KEY_TIMEOUT = 60 * 60 // 1 hour
export const checkRateLimitForApiKey = async (
  apiKey: string,
  reqAmount: number,
): Promise<boolean> => {
  const rlHash = getRateLimitHash(apiKey)
  const rlCount: number = _toNumber(await redis.get(rlHash)) || 0

  if (rlCount >= reqAmount) {
    throw new HttpException('Too many requests, please try again later', 429)
  }
  await redis.set(rlHash, 1 + rlCount, 'EX', RATE_LIMIT_FOR_API_KEY_TIMEOUT)
  return true
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

const createProjectClickhouse = async (project: Project) => {
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

const generateRecoveryCode = () =>
  randomstring.generate({
    length: 30,
    charset: 'alphabetic',
    capitalization: 'uppercase',
  })

const millisecondsToSeconds = (milliseconds: number) => milliseconds / 1000

const generateRandomString = (length: number): string =>
  randomstring.generate(length)

const getSelfhostedUUID = (): string => {
  try {
    return uuidv5(SELFHOSTED_EMAIL, UUIDV5_NAMESPACE)
  } catch {
    return DEFAULT_SELFHOSTED_UUID
  }
}

export {
  checkRateLimit,
  createProjectClickhouse,
  getProjectsClickhouse,
  updateProjectClickhouse,
  deleteProjectClickhouse,
  generateRecoveryCode,
  calculateRelativePercentage,
  millisecondsToSeconds,
  generateRandomString,
  getSelfhostedUUID,
  saveRefreshTokenClickhouse,
  findRefreshTokenClickhouse,
  deleteRefreshTokenClickhouse,
}
