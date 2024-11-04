import { NotFoundException, HttpException } from '@nestjs/common'
import { xxh3 } from '@node-rs/xxhash'
import timezones from 'countries-and-timezones'
import { v5 as uuidv5 } from 'uuid'
import _join from 'lodash/join'
import _filter from 'lodash/filter'
import _values from 'lodash/values'
import _reduce from 'lodash/reduce'
import _keys from 'lodash/keys'
import _toNumber from 'lodash/toNumber'
import _split from 'lodash/split'
import _isEmpty from 'lodash/isEmpty'
import _isNil from 'lodash/isNil'
import _head from 'lodash/head'
import _round from 'lodash/round'
import _size from 'lodash/size'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import _map from 'lodash/map'

import {
  redis,
  DEFAULT_SELFHOSTED_UUID,
  SELFHOSTED_EMAIL,
  UUIDV5_NAMESPACE,
  isDevelopment,
  isProxiedByCloudflare,
} from './constants'
import { clickhouse } from './integrations/clickhouse'
import { DEFAULT_TIMEZONE, TimeFormat } from '../user/entities/user.entity'
import { BotsProtectionLevel, Project } from '../project/entity/project.entity'
import { ProjectViewEntity } from '../project/entity/project-view.entity'

import { ClickhouseFunnel, ClickhouseSFUser } from './types'

dayjs.extend(utc)

export const hash = (content: string): string => {
  return xxh3.xxh128(content).toString(16)
}

const RATE_LIMIT_REQUESTS_AMOUNT = 3
const RATE_LIMIT_TIMEOUT = 86400 // 24 hours

const ALLOWED_KEYS = [
  'name',
  'origins',
  'ipBlacklist',
  'active',
  'public',
  'isPasswordProtected',
  'passwordHash',
  'botsProtectionLevel',
]

const ALLOWED_FUNNEL_KEYS = ['name', 'steps']

const getRateLimitHash = (ipOrApiKey: string, salt = '') =>
  `rl:${hash(`${ipOrApiKey}${salt}`)}`

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

const getFunnelClickhouse = async (
  projectId: string,
  funnelId = null,
): Promise<ClickhouseFunnel> => {
  const queryParams = {
    projectId,
    funnelId,
  }

  const query = `
    SELECT
      *
    FROM funnel
    WHERE
      projectId = {projectId:FixedString(12)}
      AND id = {funnelId:String}`

  const { data } = await clickhouse
    .query({
      query,
      query_params: queryParams,
    })
    .then(resultSet => resultSet.json<ClickhouseFunnel>())

  if (_isEmpty(data)) {
    throw new NotFoundException(
      `Funnel ${funnelId} was not found in the database`,
    )
  }

  return _head(data)
}

const getFunnelsClickhouse = async (
  projectId: string,
): Promise<ClickhouseFunnel[]> => {
  const queryParams = {
    projectId,
  }

  const query =
    'SELECT * FROM funnel WHERE projectId = {projectId:FixedString(12)}'

  const { data } = await clickhouse
    .query({
      query,
      query_params: queryParams,
    })
    .then(resultSet => resultSet.json<ClickhouseFunnel>())

  return data
}

const updateFunnelClickhouse = async (funnel: any) => {
  const filtered = _reduce(
    _filter(_keys(funnel), key => ALLOWED_FUNNEL_KEYS.includes(key)),
    (obj, key) => {
      obj[key] = funnel[key]
      return obj
    },
    {},
  )
  const columns = _keys(filtered)
  const values = _values(filtered)
  const query = `ALTER table funnel UPDATE ${_join(
    _map(columns, (col, id) => `${col}='${values[id]}'`),
    ', ',
  )} WHERE id='${funnel.id}'`

  await clickhouse.command({
    query,
  })
}

const deleteFunnelClickhouse = async (id: string) => {
  const query = `DELETE FROM funnel WHERE id = {id:String}`

  await clickhouse.command({
    query,
    query_params: {
      id,
    },
  })
}

const createFunnelClickhouse = async (funnel: Partial<ClickhouseFunnel>) => {
  const { id, name, steps, projectId } = funnel

  await clickhouse.insert({
    table: 'funnel',
    format: 'JSONEachRow',
    values: [
      {
        id,
        name,
        steps,
        projectId,
        created: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
      },
    ],
  })
}

const getProjectClickhouse = async (id: string): Promise<Project> => {
  const query = `SELECT * FROM project WHERE id = {id:FixedString(12)};`

  const { data } = await clickhouse
    .query({
      query,
      query_params: {
        id,
      },
    })
    .then(resultSet => resultSet.json<Project>())

  if (_isEmpty(data)) {
    throw new NotFoundException(`Project ${id} was not found in the database`)
  }

  return _head(data)
}

const getProjectsClickhouse = async (
  search: string = null,
): Promise<Project[]> => {
  if (search) {
    const query = `
        SELECT
          *
        FROM project
        WHERE
          name ILIKE {search:String} OR
          id ILIKE {search:String}
        ORDER BY created ASC
      `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          search: `%${search}%`,
        },
      })
      .then(resultSet => resultSet.json<Project>())

    return data
  }

  const query = 'SELECT * FROM project ORDER BY created ASC;'

  const { data } = await clickhouse
    .query({
      query,
    })
    .then(resultSet => resultSet.json<Project>())

  return data
}

const updateProjectClickhouse = async (project: any) => {
  const filtered = _reduce(
    _filter(_keys(project), key => ALLOWED_KEYS.includes(key)),
    (obj, key) => {
      obj[key] = project[key]
      return obj
    },
    {},
  )
  const columns = _keys(filtered)
  const values = _values(filtered)
  const query = `ALTER table project UPDATE ${_join(
    _map(columns, (col, id) => `${col}='${values[id]}'`),
    ', ',
  )} WHERE id='${project.id}'`

  await clickhouse.command({
    query,
  })
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

const deleteProjectClickhouse = async (id: string) => {
  const query = `DELETE FROM project WHERE id = {id:FixedString(12)}`

  await clickhouse.command({
    query,
    query_params: {
      id,
    },
  })
}

const createProjectClickhouse = async (project: Partial<Project>) => {
  const { id, name } = project

  await clickhouse.insert({
    table: 'project',
    format: 'JSONEachRow',
    values: [
      {
        id,
        name,
        origins: '',
        ipBlacklist: '',
        active: 1,
        public: 0,
        isPasswordProtected: 0,
        passwordHash: null,
        botsProtectionLevel: BotsProtectionLevel.BASIC,
        created: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
      },
    ],
  })
}

const saveRefreshTokenClickhouse = async (
  userId: string,
  refreshToken: string,
) => {
  await clickhouse.insert({
    table: 'refresh_token',
    format: 'JSONEachRow',
    values: [
      {
        userId,
        refreshToken,
      },
    ],
  })
}

const findRefreshTokenClickhouse = async (
  userId: string,
  refreshToken: string,
) => {
  const query =
    'SELECT * FROM refresh_token WHERE userId = {userId:String} AND refreshToken = {refreshToken:String}'

  const { data } = await clickhouse
    .query({
      query,
      query_params: {
        userId,
        refreshToken,
      },
    })
    .then(resultSet => resultSet.json())

  return data
}

const deleteRefreshTokenClickhouse = async (
  userId: string,
  refreshToken: string,
) => {
  const query = `DELETE FROM refresh_token WHERE userId = {userId:String} AND refreshToken = {refreshToken:String}`

  await clickhouse.command({
    query,
    query_params: {
      userId,
      refreshToken,
    },
  })
}

interface IClickhouseUser {
  timezone?: string
  timeFormat?: string
  showLiveVisitorsInTitle?: number
}

const CLICKHOUSE_SETTINGS_ID = 'sfuser'

const createUserClickhouse = async (user: IClickhouseUser) => {
  const { timezone, timeFormat, showLiveVisitorsInTitle } = user

  await clickhouse.insert({
    table: 'sfuser',
    format: 'JSONEachRow',
    values: [
      {
        id: CLICKHOUSE_SETTINGS_ID,
        timezone,
        timeFormat,
        showLiveVisitorsInTitle,
      },
    ],
  })
}

const getUserClickhouse = async () => {
  const query = `SELECT * FROM sfuser WHERE id = {id:String}`

  try {
    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          id: CLICKHOUSE_SETTINGS_ID,
        },
      })
      .then(resultSet => resultSet.json<ClickhouseSFUser>())

    return data[0] || ({} as ClickhouseSFUser)
  } catch {
    return {}
  }
}

const userClickhouseExists = async () => {
  const query = `SELECT * FROM sfuser WHERE id = '${CLICKHOUSE_SETTINGS_ID}'`

  try {
    const { data } = await clickhouse
      .query({
        query,
      })
      .then(resultSet => resultSet.json())

    return !_isEmpty(data)
  } catch {
    return false
  }
}

const updateUserClickhouse = async (user: IClickhouseUser) => {
  const userExists = await userClickhouseExists()

  if (!userExists) {
    await createUserClickhouse({
      timezone: DEFAULT_TIMEZONE,
      timeFormat: TimeFormat['12-hour'],
      showLiveVisitorsInTitle: 0,
      ...user,
    })
  }

  let query = 'ALTER table sfuser UPDATE '
  let separator = ''

  if (!_isNil(user.timezone)) {
    query += `${separator}timezone={timezone:String}`
    separator = ', '
  }

  if (!_isNil(user.timeFormat)) {
    query += `${separator}timeFormat={timeFormat:String}`
    separator = ', '
  }

  if (!_isNil(user.showLiveVisitorsInTitle)) {
    query += `${separator}showLiveVisitorsInTitle={showLiveVisitorsInTitle:Int8}`
    separator = ', '
  }

  query += ` WHERE id={id:String}`

  await clickhouse.command({
    query,
    query_params: {
      ...user,
      id: CLICKHOUSE_SETTINGS_ID,
    },
  })
}

const findProjectViewCustomEventsClickhouse = async (viewId: string) => {
  try {
    const { data } = await clickhouse
      .query({
        query:
          'SELECT * FROM projects_views_custom_events WHERE viewId = {viewId:FixedString(36)}',
        query_params: {
          viewId,
        },
      })
      .then(resultSet => resultSet.json())

    return data
  } catch {
    return []
  }
}

const doesProjectViewExistClickhouse = async (
  projectId: string,
  id: string,
): Promise<boolean> => {
  try {
    const { data } = await clickhouse
      .query({
        query: `
          SELECT
            count(*) AS count
          FROM
            project_views
          WHERE
            id = {id:FixedString(36)}
            AND projectId = {projectId:FixedString(12)}
          `,
        query_params: {
          id,
          projectId,
        },
      })
      .then(resultSet => resultSet.json<{ count: number }>())

    if (_isEmpty(data)) {
      return false
    }

    return data[0]?.count > 0
  } catch {
    return false
  }
}

const findProjectViewClickhouse = async (id: string, projectId: string) => {
  try {
    const { data } = await clickhouse
      .query({
        query: `
          SELECT
            *
          FROM
            project_views
          WHERE
            id = {id:FixedString(36)}
            AND projectId = {projectId:FixedString(12)}
          `,
        query_params: {
          id,
          projectId,
        },
      })
      .then(resultSet => resultSet.json())

    if (_isEmpty(data)) {
      return null
    }

    const view: any = data[0]
    const customEvents = await findProjectViewCustomEventsClickhouse(id)

    return {
      ...view,
      customEvents,
    }
  } catch {
    return null
  }
}

const findProjectViewsClickhouse = async (projectId: string) => {
  try {
    const { data } = await clickhouse
      .query({
        query: `
          SELECT
            *
          FROM
            project_views
          WHERE
            projectId = {projectId:FixedString(12)}
          `,
        query_params: {
          projectId,
        },
      })
      .then(resultSet => resultSet.json())

    if (_isEmpty(data)) {
      return []
    }

    const result = []

    for (let i = 0; i < _size(data); ++i) {
      const view: any = data[i]
      // eslint-disable-next-line no-await-in-loop
      const customEvents = await findProjectViewCustomEventsClickhouse(view.id)

      result.push({
        ...view,
        customEvents,
      })
    }

    return result
  } catch {
    return []
  }
}

const deleteProjectViewClickhouse = async (id: string) => {
  const query = `DELETE FROM project_views WHERE id = {id:FixedString(36)}`

  await clickhouse.command({
    query,
    query_params: {
      id,
    },
  })
}

const deleteCustomMetricsClickhouse = async (viewId: string) => {
  const query = `DELETE FROM projects_views_custom_events WHERE viewId = {viewId:FixedString(36)}`

  await clickhouse.command({
    query,
    query_params: {
      viewId,
    },
  })
}

const createProjectViewClickhouse = async (
  view: Partial<ProjectViewEntity>,
) => {
  const { id, projectId, name, type, filters, customEvents } = view

  const createdAt = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')

  await clickhouse.insert({
    table: 'project_views',
    format: 'JSONEachRow',
    values: [
      {
        id,
        projectId,
        name,
        type,
        filters,
        createdAt,
        updatedAt: createdAt,
      },
    ],
  })

  if (!_isEmpty(customEvents)) {
    await clickhouse.insert({
      table: 'projects_views_custom_events',
      format: 'JSONEachRow',
      values: customEvents,
    })
  }
}

const updateProjectViewClickhouse = async (viewId: string, view: any) => {
  await clickhouse.command({
    query: `
      ALTER TABLE
        project_views
      UPDATE
        name={name:String},
        filters={filters:String}
      WHERE
        id={viewId:String}
    `,
    query_params: {
      name: view.name,
      filters: view.filters,
      viewId,
    },
  })

  await deleteCustomMetricsClickhouse(viewId)

  if (!_isEmpty(view.customEvents)) {
    await clickhouse.insert({
      table: 'projects_views_custom_events',
      format: 'JSONEachRow',
      values: view.customEvents,
    })
  }
}

const millisecondsToSeconds = (milliseconds: number) => milliseconds / 1000

export const isPrimaryNode = () => {
  return process.env.IS_PRIMARY_NODE === 'true'
}

const getSelfhostedUUID = (): string => {
  try {
    return uuidv5(SELFHOSTED_EMAIL, UUIDV5_NAMESPACE)
  } catch {
    return DEFAULT_SELFHOSTED_UUID
  }
}

interface IPGeoDetails {
  country: string | null
  region: string | null
  city: string | null
}

const getGeoDetails = (
  ip: string,
  tz?: string,
  headers?: unknown,
): IPGeoDetails => {
  // Stage 1: Using IP address based geo lookup
  // TODO: Add support for DBIP for self-hosted

  // Stage 2: If Cloudflare is enabled, use their headers
  if (
    isProxiedByCloudflare &&
    headers['cf-ipcountry'] &&
    headers?.['cf-ipcountry'] !== 'XX'
  ) {
    return {
      country: headers['cf-ipcountry'],
      city: null,
      region: null,
    }
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

const sumArrays = (source: number[], target: number[]) => {
  const result = []
  const size = _size(source)

  for (let i = 0; i < size; ++i) {
    result.push(source[i] + target[i])
  }

  return result
}

export {
  checkRateLimit,
  createProjectClickhouse,
  getProjectClickhouse,
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
  sumArrays,
  getFunnelClickhouse,
  getFunnelsClickhouse,
  updateFunnelClickhouse,
  deleteFunnelClickhouse,
  createFunnelClickhouse,
  findProjectViewClickhouse,
  deleteProjectViewClickhouse,
  findProjectViewsClickhouse,
  createProjectViewClickhouse,
  doesProjectViewExistClickhouse,
  updateProjectViewClickhouse,
}
