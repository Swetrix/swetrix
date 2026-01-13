import { NotFoundException, HttpException } from '@nestjs/common'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import net from 'net'
import randomstring from 'randomstring'
import { CityResponse, Reader } from 'maxmind'
import timezones from 'countries-and-timezones'
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

import { redis, isDevelopment, SELFHOSTED_GEOIP_DB_PATH } from './constants'
import { clickhouse } from './integrations/clickhouse'
import { BotsProtectionLevel, Project } from '../project/entity/project.entity'
import { ProjectViewEntity } from '../project/entity/project-view.entity'

import { ClickhouseFunnel, ClickhouseAnnotation, ClickhouseSalt } from './types'

dayjs.extend(utc)

export interface ClickhouseProjectShare {
  id: string
  userId: string
  projectId: string
  role: string
  confirmed: number
  created: string
  updated: string
}

interface ClickhouseProjectShareWithUser {
  id: string
  role: string
  confirmed: number
  created: string
  updated: string
  userId: string
  email: string
}

interface ClickhouseProjectShareWithProject {
  id: string
  role: string
  confirmed: number
  created: string
  updated: string
  projectId: string
  projectName: string
  projectOrigins: string
  projectIpBlacklist: string
  projectCountryBlacklist: string
  projectActive: number
  projectPublic: number
  projectIsPasswordProtected: number
  projectBotsProtectionLevel: number
  projectCreated: string
}

/*
  Returns a 32-character hash of the provided string using Node.js crypto module.
  (SHA-256 truncated to 32 chars)
*/
export const hash = (content: string): string => {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex')
    .substring(0, 32)
}

/**
 * Derives a key from the SECRET_KEY_BASE environment variable using the HKDF algorithm.
 */
export const deriveKey = (
  purpose: 'refresh-token' | 'access-token',
  length = 32,
) => {
  const base = Buffer.from(process.env.SECRET_KEY_BASE || '', 'utf8')
  const info = Buffer.from(purpose, 'utf8')
  return Buffer.from(
    crypto.hkdfSync('sha256', base, '', info, length),
  ).toString('hex')
}

export const generateRandomId = (alphabet: string, size: number) => {
  const bytes = crypto.randomBytes(size)
  let id = ''

  for (let i = 0; i < size; i++) {
    id += alphabet[bytes[i] % alphabet.length]
  }

  return id
}

export const generateRandomString = (length: number): string =>
  randomstring.generate(length)

const RATE_LIMIT_REQUESTS_AMOUNT = 3
const RATE_LIMIT_TIMEOUT = 86400 // 24 hours

const ALLOWED_KEYS = [
  'name',
  'origins',
  'ipBlacklist',
  'countryBlacklist',
  'active',
  'public',
  'isPasswordProtected',
  'passwordHash',
  'botsProtectionLevel',
  'websiteUrl',
  'captchaSecretKey',
  'captchaDifficulty',
]

const CLICKHOUSE_PROJECT_UPDATABLE_KEYS = [...ALLOWED_KEYS, 'adminId']

const ALLOWED_FUNNEL_KEYS = ['name', 'steps']
const ALLOWED_SHARE_KEYS = ['role', 'confirmed']

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
    .then((resultSet) => resultSet.json<ClickhouseFunnel>())

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
    .then((resultSet) => resultSet.json<ClickhouseFunnel>())

  return data
}

const deleteAllRefreshTokensClickhouse = async (userId: string) => {
  const query = `ALTER TABLE refresh_token DELETE WHERE userId = {userId:String}`

  await clickhouse.command({
    query,
    query_params: {
      userId,
    },
  })
}

const updateFunnelClickhouse = async (funnel: any) => {
  const filtered = _reduce(
    _filter(_keys(funnel), (key) => ALLOWED_FUNNEL_KEYS.includes(key)),
    (obj, key) => {
      obj[key] = funnel[key]
      return obj
    },
    {},
  )
  const columns = _keys(filtered)

  if (_isEmpty(columns)) {
    return
  }

  const params: Record<string, string> = { id: funnel.id }

  const assignments = _map(columns, (col) => {
    params[col] = filtered[col]
    return `${col}={${col}:String}`
  }).join(', ')

  const query = `ALTER TABLE funnel UPDATE ${assignments} WHERE id={id:String}`

  await clickhouse.command({
    query,
    query_params: params,
  })
}

const deleteFunnelClickhouse = async (id: string) => {
  const query = `ALTER TABLE funnel DELETE WHERE id = {id:String}`

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
    .then((resultSet) => resultSet.json<Project>())

  if (_isEmpty(data)) {
    throw new NotFoundException(`Project ${id} was not found in the database`)
  }

  return _head(data)
}

const getProjectsClickhouse = async (
  adminId: string,
  search: string = null,
  sort: 'alpha_asc' | 'alpha_desc' | 'date_asc' | 'date_desc' = 'alpha_asc',
): Promise<Project[]> => {
  // Build the secondary ORDER BY based on sort parameter
  let secondaryOrderBy = 'p.name ASC'

  if (sort === 'alpha_asc') {
    secondaryOrderBy = 'p.name ASC'
  } else if (sort === 'alpha_desc') {
    secondaryOrderBy = 'p.name DESC'
  } else if (sort === 'date_asc') {
    secondaryOrderBy = 'p.created ASC'
  } else if (sort === 'date_desc') {
    secondaryOrderBy = 'p.created DESC'
  }

  // Always sort pinned projects first, then apply the requested sort
  const orderBy = `ORDER BY isPinned DESC, ${secondaryOrderBy}`

  if (search) {
    const query = `
        SELECT
          p.*,
          CASE WHEN pp.projectId IS NOT NULL THEN 1 ELSE 0 END AS isPinned
        FROM project p
        LEFT JOIN pinned_project pp ON pp.projectId = p.id AND pp.visitorId = {adminId:String}
        WHERE
          p.adminId = {adminId:FixedString(36)}
          AND (p.name ILIKE {search:String} OR p.id ILIKE {search:String})
        ${orderBy}
      `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          search: `%${search}%`,
          adminId,
        },
      })
      .then((resultSet) => resultSet.json<Project>())

    return data
  }

  const query = `
    SELECT
      p.*,
      CASE WHEN pp.projectId IS NOT NULL THEN 1 ELSE 0 END AS isPinned
    FROM project p
    LEFT JOIN pinned_project pp ON pp.projectId = p.id AND pp.visitorId = {adminId:String}
    WHERE p.adminId = {adminId:FixedString(36)}
    ${orderBy};
  `

  const { data } = await clickhouse
    .query({
      query,
      query_params: {
        adminId,
      },
    })
    .then((resultSet) => resultSet.json<Project>())

  return data
}

const updateProjectClickhouse = async (
  project: any,
  options: { ignoreAllowedKeys?: boolean } = {},
) => {
  const updatableKeys = options.ignoreAllowedKeys
    ? CLICKHOUSE_PROJECT_UPDATABLE_KEYS
    : ALLOWED_KEYS

  const filtered = _reduce(
    _filter(_keys(project), (key) => updatableKeys.includes(key)),
    (obj, key) => {
      obj[key] = project[key]
      return obj
    },
    {},
  )

  const columns = _keys(filtered)
  if (_isEmpty(columns)) {
    return
  }

  const INT8_COLUMNS = ['active', 'public', 'isPasswordProtected']
  const UINT8_COLUMNS = ['captchaDifficulty']
  const params: Record<string, any> = { id: project.id }

  const assignments = _map(columns, (col) => {
    params[col] = filtered[col]
    let type = 'String'
    if (INT8_COLUMNS.includes(col)) {
      type = 'Int8'
    } else if (UINT8_COLUMNS.includes(col)) {
      type = 'UInt8'
    }
    return `${col}={${col}:${type}}`
  }).join(', ')

  const query = `ALTER TABLE project UPDATE ${assignments} WHERE id={id:FixedString(12)}`

  await clickhouse.command({
    query,
    query_params: params,
  })
}

const assignUnassignedProjectsToUserClickhouse = async (userId: string) => {
  const query = `ALTER TABLE project UPDATE adminId = {userId:FixedString(36)} WHERE adminId IS NULL`

  await clickhouse.command({
    query,
    query_params: {
      userId,
    },
  })
}

const deleteProjectClickhouse = async (id: string) => {
  const query = `ALTER TABLE project DELETE WHERE id = {id:FixedString(12)}`

  await clickhouse.command({
    query,
    query_params: {
      id,
    },
  })
}

const deleteProjectsByUserIdClickhouse = async (userId: string) => {
  await clickhouse.command({
    query: `ALTER TABLE project DELETE WHERE adminId = {userId:FixedString(36)}`,
    query_params: { userId },
  })
}

const deleteProjectSharesByProjectClickhouse = async (projectId: string) => {
  await clickhouse.command({
    query:
      'ALTER TABLE project_share DELETE WHERE projectId = {projectId:FixedString(12)}',
    query_params: { projectId },
  })
}

const deleteProjectSharesByUserIdClickhouse = async (userId: string) => {
  await clickhouse.command({
    query: `ALTER TABLE project_share DELETE WHERE userId = {userId:FixedString(36)}`,
    query_params: { userId },
  })
}

const createProjectClickhouse = async (project: Partial<Project>) => {
  const { id, name, adminId, websiteUrl } = project

  await clickhouse.insert({
    table: 'project',
    format: 'JSONEachRow',
    values: [
      {
        id,
        name,
        origins: '',
        ipBlacklist: '',
        countryBlacklist: '',
        active: 1,
        public: 0,
        isPasswordProtected: 0,
        passwordHash: null,
        botsProtectionLevel: BotsProtectionLevel.BASIC,
        adminId: adminId || null,
        websiteUrl: websiteUrl || null,
        created: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
      },
    ],
  })
}

const findProjectShareClickhouse = async (
  id: string,
): Promise<ClickhouseProjectShare | null> => {
  try {
    const { data } = await clickhouse
      .query({
        query: `SELECT * FROM project_share WHERE id = {id:FixedString(36)}`,
        query_params: { id },
      })
      .then((resultSet) => resultSet.json<ClickhouseProjectShare>())

    if (_isEmpty(data)) {
      return null
    }

    return data[0]
  } catch {
    return null
  }
}

const findProjectSharesByProjectClickhouse = async (
  projectId: string,
): Promise<ClickhouseProjectShareWithUser[]> => {
  try {
    const { data } = await clickhouse
      .query({
        query: `
          SELECT
            ps.id as id,
            ps.role as role,
            ps.confirmed as confirmed,
            ps.created as created,
            ps.updated as updated,
            u.id as userId,
            u.email as email
          FROM project_share ps
          LEFT JOIN user u ON ps.userId = u.id
          WHERE ps.projectId = {projectId:FixedString(12)}
        `,
        query_params: { projectId },
      })
      .then((resultSet) => resultSet.json<ClickhouseProjectShareWithUser>())

    return data
  } catch {
    return []
  }
}

const findProjectSharesByUserClickhouse = async (
  userId: string,
  search: string = null,
): Promise<ClickhouseProjectShareWithProject[]> => {
  try {
    const whereSearch = search ? 'AND p.name ILIKE {search:String}' : ''

    const { data } = await clickhouse
      .query({
        query: `
          SELECT
            ps.id AS id,
            ps.role AS role,
            ps.confirmed AS confirmed,
            ps.created AS created,
            ps.updated AS updated,
            p.id AS projectId,
            p.name AS projectName,
            p.origins AS projectOrigins,
            p.ipBlacklist AS projectIpBlacklist,
            p.countryBlacklist AS projectCountryBlacklist,
            p.active AS projectActive,
            p.public AS projectPublic,
            p.isPasswordProtected AS projectIsPasswordProtected,
            p.botsProtectionLevel AS projectBotsProtectionLevel,
            p.created AS projectCreated
          FROM project_share ps
          LEFT JOIN project p ON ps.projectId = p.id
          WHERE ps.userId = {userId:FixedString(36)}
          ${whereSearch}
        `,
        query_params: { userId, search: `%${search}%` },
      })
      .then((resultSet) => resultSet.json<ClickhouseProjectShareWithProject>())

    return data
  } catch {
    return []
  }
}

const findProjectShareByUserAndProjectClickhouse = async (
  userId: string,
  projectId: string,
): Promise<ClickhouseProjectShare | null> => {
  try {
    const { data } = await clickhouse
      .query({
        query: `
          SELECT * FROM project_share
          WHERE userId = {userId:FixedString(36)}
          AND projectId = {projectId:FixedString(12)}
        `,
        query_params: { userId, projectId },
      })
      .then((resultSet) => resultSet.json<ClickhouseProjectShare>())

    if (_isEmpty(data)) {
      return null
    }

    return data[0]
  } catch {
    return null
  }
}

const createProjectShareClickhouse = async (share: {
  id: string
  userId: string
  projectId: string
  role: string
  confirmed?: number
}) => {
  const { id, userId, projectId, role } = share
  const confirmed = share.confirmed ?? 0
  const now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')

  await clickhouse.insert({
    table: 'project_share',
    format: 'JSONEachRow',
    values: [
      {
        id,
        userId,
        projectId,
        role,
        confirmed,
        created: now,
        updated: now,
      },
    ],
  })
}

const updateProjectShareClickhouse = async (
  id: string,
  update: Partial<{ role: string; confirmed: number }>,
) => {
  const filtered = _reduce(
    _filter(_keys(update), (key) => ALLOWED_SHARE_KEYS.includes(key)),
    (obj, key) => {
      obj[key] = update[key]
      return obj
    },
    {},
  )

  const columns = _keys(filtered)
  const values = _values(filtered)

  if (_isEmpty(columns)) {
    return
  }

  const assignments = _map(columns, (col, idx) => {
    const _val = values[idx]
    const type = col === 'confirmed' ? 'Int8' : 'String'
    return `${col}={v_${idx}:${type}}`
  }).join(', ')

  const params = _reduce(
    values,
    (acc, cur, idx) => ({
      ...acc,
      [`v_${idx}`]: cur,
    }),
    {},
  )

  await clickhouse.command({
    query: `ALTER TABLE project_share UPDATE ${assignments}, updated={updated:String} WHERE id={id:FixedString(36)}`,
    query_params: {
      ...params,
      id,
      updated: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
    },
  })
}

const deleteProjectShareClickhouse = async (id: string) => {
  await clickhouse.command({
    query: `ALTER TABLE project_share DELETE WHERE id={id:FixedString(36)}`,
    query_params: { id },
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
    .then((resultSet) => resultSet.json())

  return data
}

const deleteRefreshTokenClickhouse = async (
  userId: string,
  refreshToken: string,
) => {
  const query = `ALTER TABLE refresh_token DELETE WHERE userId = {userId:String} AND refreshToken = {refreshToken:String}`

  await clickhouse.command({
    query,
    query_params: {
      userId,
      refreshToken,
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
      .then((resultSet) => resultSet.json())

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
      .then((resultSet) => resultSet.json<{ count: number }>())

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
      .then((resultSet) => resultSet.json())

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
      .then((resultSet) => resultSet.json())

    if (_isEmpty(data)) {
      return []
    }

    const result = []

    for (let i = 0; i < _size(data); ++i) {
      const view: any = data[i]

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
  const query = `ALTER TABLE project_views DELETE WHERE id = {id:FixedString(36)}`

  await clickhouse.command({
    query,
    query_params: {
      id,
    },
  })
}

const deleteCustomMetricsClickhouse = async (viewId: string) => {
  const query = `ALTER TABLE projects_views_custom_events DELETE WHERE viewId = {viewId:FixedString(36)}`

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

// Annotation functions
const ALLOWED_ANNOTATION_KEYS = ['date', 'text']

const getAnnotationsClickhouse = async (
  projectId: string,
): Promise<ClickhouseAnnotation[]> => {
  const queryParams = {
    projectId,
  }

  const query =
    'SELECT * FROM annotation WHERE projectId = {projectId:FixedString(12)} ORDER BY date ASC'

  const { data } = await clickhouse
    .query({
      query,
      query_params: queryParams,
    })
    .then((resultSet) => resultSet.json<ClickhouseAnnotation>())

  return data
}

const getAnnotationClickhouse = async (
  projectId: string,
  annotationId: string,
): Promise<ClickhouseAnnotation | null> => {
  const queryParams = {
    projectId,
    annotationId,
  }

  const query = `
    SELECT
      *
    FROM annotation
    WHERE
      projectId = {projectId:FixedString(12)}
      AND id = {annotationId:FixedString(36)}`

  const { data } = await clickhouse
    .query({
      query,
      query_params: queryParams,
    })
    .then((resultSet) => resultSet.json<ClickhouseAnnotation>())

  if (_isEmpty(data)) {
    return null
  }

  return _head(data)
}

const createAnnotationClickhouse = async (
  annotation: Partial<ClickhouseAnnotation>,
) => {
  const { id, date, text, projectId } = annotation

  await clickhouse.insert({
    table: 'annotation',
    format: 'JSONEachRow',
    values: [
      {
        id,
        date,
        text,
        projectId,
        created: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
      },
    ],
  })
}

const updateAnnotationClickhouse = async (annotation: {
  id: string
  date?: string
  text?: string
}) => {
  const filtered = _reduce(
    _filter(
      _keys(annotation),
      (key) => ALLOWED_ANNOTATION_KEYS.includes(key) && annotation[key] != null,
    ),
    (obj, key) => {
      obj[key] = annotation[key]
      return obj
    },
    {},
  )
  const columns = _keys(filtered)

  if (_isEmpty(columns)) {
    return
  }

  const params: Record<string, string> = { id: annotation.id }

  const assignments = _map(columns, (col) => {
    params[col] = filtered[col]
    const type = col === 'date' ? 'Date' : 'String'
    return `${col}={${col}:${type}}`
  }).join(', ')

  const query = `ALTER TABLE annotation UPDATE ${assignments} WHERE id={id:FixedString(36)}`

  await clickhouse.command({
    query,
    query_params: params,
  })
}

const deleteAnnotationClickhouse = async (id: string) => {
  const query = `ALTER TABLE annotation DELETE WHERE id = {id:FixedString(36)}`

  await clickhouse.command({
    query,
    query_params: {
      id,
    },
  })
}

export const isPrimaryNode = () => {
  return process.env.IS_PRIMARY_NODE === 'true'
}

const dummyLookup = () => ({
  country: {
    names: {
      en: null,
    },
  },
  city: {
    names: {
      en: null,
    },
  },
  subdivisions: [
    {
      names: {
        en: null,
      },
    },
  ],
})

const DEVELOPMENT_GEOIP_DB_PATH = path.join(
  __dirname,
  '../../../..',
  'ip-geolocation-db.mmdb',
)
const PRODUCTION_GEOIP_DB_PATH = path.join(
  __dirname,
  '../..',
  'ip-geolocation-db.mmdb',
)

let lookup: Reader<CityResponse> = {
  // @ts-ignore
  get: dummyLookup,
}

if (SELFHOSTED_GEOIP_DB_PATH && fs.existsSync(SELFHOSTED_GEOIP_DB_PATH)) {
  const buffer = fs.readFileSync(SELFHOSTED_GEOIP_DB_PATH)
  lookup = new Reader<CityResponse>(buffer)
} else if (fs.existsSync(PRODUCTION_GEOIP_DB_PATH)) {
  const buffer = fs.readFileSync(PRODUCTION_GEOIP_DB_PATH)
  lookup = new Reader<CityResponse>(buffer)
} else if (fs.existsSync(DEVELOPMENT_GEOIP_DB_PATH)) {
  const buffer = fs.readFileSync(DEVELOPMENT_GEOIP_DB_PATH)
  lookup = new Reader<CityResponse>(buffer)
}

interface IPGeoDetails {
  country: string | null
  region: string | null
  city: string | null
  regionCode: string | null
}

const getGeoDetails = (ip: string, tz?: string): IPGeoDetails => {
  // Stage 1: Using IP address based geo lookup
  const data = lookup.get(ip)

  const country = data?.country?.iso_code || null
  // TODO: Add city overrides, for example, Colinton -> Edinburgh, etc.
  const city = data?.city?.names?.en || null
  const region = data?.subdivisions?.[0]?.names?.en || null
  const regionCode = data?.subdivisions?.[0]?.iso_code || null

  if (country) {
    return {
      country,
      city,
      region,
      regionCode,
    }
  }

  // Stage 2: Using timezone based geo lookup as a fallback
  const tzCountry = timezones.getCountryForTimezone(tz)?.id || null

  return {
    country: tzCountry,
    city: null,
    region: null,
    regionCode: null,
  }
}

const normalise = (raw: unknown): string | null => {
  if (!raw) return null
  const str = String(raw)
  const first = str.split(',')[0]?.trim()
  if (!first) return null

  // Handle bracketed IPv6 like: [::1]:1234
  const unbracketed = first.replace(/^\[([^\]]+)\](?::\d+)?$/, '$1')

  if (net.isIP(unbracketed)) return unbracketed

  // Handle IPv4 with port like: 203.0.113.1:1234
  const ipv4PortMatch = unbracketed.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/)
  if (ipv4PortMatch?.[1] && net.isIP(ipv4PortMatch[1])) {
    return ipv4PortMatch[1]
  }

  return null
}

const getIPFromHeaders = (headers: any) => {
  const customHeader = process.env.CLIENT_IP_HEADER

  if (customHeader && headers.get(customHeader)) {
    return normalise(headers.get(customHeader))
  }

  return normalise(headers?.['x-forwarded-for'])
}

const sumArrays = (source: number[], target: number[]) => {
  const result = []
  const size = _size(source)

  for (let i = 0; i < size; ++i) {
    result.push(source[i] + target[i])
  }

  return result
}

// Pinned projects functions
const getPinnedProjectsClickhouse = async (
  visitorId: string,
): Promise<string[]> => {
  const query = `SELECT projectId FROM pinned_project WHERE visitorId = {visitorId:String};`

  const { data } = await clickhouse
    .query({
      query,
      query_params: { visitorId },
    })
    .then((resultSet) => resultSet.json<{ projectId: string }>())

  return _map(data, (row) => row.projectId)
}

const pinProjectClickhouse = async (
  visitorId: string,
  projectId: string,
): Promise<void> => {
  const id = crypto.randomUUID()
  const now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')

  await clickhouse.insert({
    table: 'pinned_project',
    format: 'JSONEachRow',
    values: [
      {
        id,
        visitorId,
        projectId,
        created: now,
      },
    ],
  })
}

const unpinProjectClickhouse = async (
  visitorId: string,
  projectId: string,
): Promise<void> => {
  const query = `ALTER TABLE pinned_project DELETE WHERE visitorId = {visitorId:String} AND projectId = {projectId:FixedString(12)};`

  await clickhouse.command({
    query,
    query_params: { visitorId, projectId },
  })
}

// Salt functions
const getSaltClickhouse = async (
  rotation: string,
): Promise<ClickhouseSalt | null> => {
  const query = `SELECT * FROM salt WHERE rotation = {rotation:String}`

  try {
    const { data } = await clickhouse
      .query({
        query,
        query_params: { rotation },
      })
      .then((resultSet) => resultSet.json<ClickhouseSalt>())

    return _head(data) || null
  } catch {
    return null
  }
}

const saveSaltClickhouse = async (saltData: ClickhouseSalt) => {
  const existing = await getSaltClickhouse(saltData.rotation)

  if (existing) {
    const query = `ALTER TABLE salt UPDATE salt = {salt:String}, expiresAt = {expiresAt:String} WHERE rotation = {rotation:String}`
    await clickhouse.command({
      query,
      query_params: {
        salt: saltData.salt,
        expiresAt: saltData.expiresAt,
        rotation: saltData.rotation,
      },
    })
  } else {
    await clickhouse.insert({
      table: 'salt',
      format: 'JSONEachRow',
      values: [saltData],
    })
  }
}

export {
  checkRateLimit,
  createProjectClickhouse,
  getProjectClickhouse,
  getProjectsClickhouse,
  updateProjectClickhouse,
  deleteProjectClickhouse,
  millisecondsToSeconds,
  saveRefreshTokenClickhouse,
  findRefreshTokenClickhouse,
  deleteRefreshTokenClickhouse,
  deleteAllRefreshTokensClickhouse,
  getGeoDetails,
  getIPFromHeaders,
  sumArrays,
  assignUnassignedProjectsToUserClickhouse,
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
  // shares
  findProjectShareClickhouse,
  findProjectSharesByProjectClickhouse,
  findProjectSharesByUserClickhouse,
  findProjectShareByUserAndProjectClickhouse,
  createProjectShareClickhouse,
  updateProjectShareClickhouse,
  deleteProjectShareClickhouse,
  deleteProjectSharesByProjectClickhouse,
  deleteProjectSharesByUserIdClickhouse,
  deleteProjectsByUserIdClickhouse,
  // annotations
  getAnnotationsClickhouse,
  getAnnotationClickhouse,
  createAnnotationClickhouse,
  updateAnnotationClickhouse,
  deleteAnnotationClickhouse,
  // pinned projects
  getPinnedProjectsClickhouse,
  pinProjectClickhouse,
  unpinProjectClickhouse,
  // salt
  getSaltClickhouse,
  saveSaltClickhouse,
}
