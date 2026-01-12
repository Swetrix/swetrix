import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import _isEmpty from 'lodash/isEmpty'
import _head from 'lodash/head'
import _map from 'lodash/map'
import _filter from 'lodash/filter'
import _keys from 'lodash/keys'
import _reduce from 'lodash/reduce'

import { clickhouse } from '../common/integrations/clickhouse'
import {
  FeatureFlag,
  ClickhouseFeatureFlag,
  FeatureFlagType,
  TargetingRule,
} from './entity/feature-flag.entity'
import { Pagination } from '../common/pagination/pagination'
import { PaginationOptionsInterface } from '../common/pagination/pagination.results.interface'
import {
  evaluateFlag as sharedEvaluateFlag,
  evaluateFlags as sharedEvaluateFlags,
} from './evaluation'

dayjs.extend(utc)

const ALLOWED_FLAG_KEYS = [
  'key',
  'description',
  'flagType',
  'rolloutPercentage',
  'targetingRules',
  'enabled',
]

@Injectable()
export class FeatureFlagService {
  formatFlagFromClickhouse(flag: ClickhouseFeatureFlag): FeatureFlag | null {
    if (!flag) {
      return null
    }

    let targetingRules: TargetingRule[] | null = null
    if (flag.targetingRules) {
      try {
        targetingRules = JSON.parse(flag.targetingRules)
      } catch {
        targetingRules = null
      }
    }

    return {
      id: flag.id,
      key: flag.key,
      description: flag.description,
      flagType: flag.flagType as FeatureFlagType,
      rolloutPercentage: flag.rolloutPercentage,
      targetingRules,
      enabled: Boolean(flag.enabled),
      projectId: flag.projectId,
      created: flag.created,
    }
  }

  formatFlagToClickhouse(
    flag: Partial<FeatureFlag>,
  ): Partial<ClickhouseFeatureFlag> {
    const result: Partial<ClickhouseFeatureFlag> = { ...flag } as any

    if (flag.targetingRules !== undefined) {
      result.targetingRules = flag.targetingRules
        ? JSON.stringify(flag.targetingRules)
        : null
    }

    if (flag.enabled !== undefined) {
      result.enabled = flag.enabled ? 1 : 0
    }

    return result
  }

  async findOne(id: string): Promise<FeatureFlag | null> {
    // If the underlying ClickHouse table ever accumulates duplicate rows for the same id
    // (e.g. due to ingestion or merge behaviour), ensure we pick a deterministic row.
    const query = `
      SELECT * FROM feature_flag
      WHERE id = {id:String}
      ORDER BY created DESC
      LIMIT 1
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { id },
      })
      .then((resultSet) => resultSet.json<ClickhouseFeatureFlag>())

    if (_isEmpty(data)) {
      return null
    }

    return this.formatFlagFromClickhouse(_head(data))
  }

  async findByKey(projectId: string, key: string): Promise<FeatureFlag | null> {
    const query = `
      SELECT * FROM feature_flag 
      WHERE projectId = {projectId:FixedString(12)} 
      AND key = {key:String}
      ORDER BY created DESC
      LIMIT 1
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { projectId, key },
      })
      .then((resultSet) => resultSet.json<ClickhouseFeatureFlag>())

    if (_isEmpty(data)) {
      return null
    }

    return this.formatFlagFromClickhouse(_head(data))
  }

  async findByProject(projectId: string): Promise<FeatureFlag[]> {
    const query = `
      SELECT * FROM feature_flag 
      WHERE projectId = {projectId:FixedString(12)} 
      ORDER BY key ASC
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { projectId },
      })
      .then((resultSet) => resultSet.json<ClickhouseFeatureFlag>())

    return _map(data, (flag) => this.formatFlagFromClickhouse(flag)).filter(
      (flag): flag is FeatureFlag => flag !== null,
    )
  }

  async findEnabledByProject(projectId: string): Promise<FeatureFlag[]> {
    const query = `
      SELECT * FROM feature_flag 
      WHERE projectId = {projectId:FixedString(12)} 
      AND enabled = 1
      ORDER BY key ASC
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { projectId },
      })
      .then((resultSet) => resultSet.json<ClickhouseFeatureFlag>())

    return _map(data, (flag) => this.formatFlagFromClickhouse(flag)).filter(
      (flag): flag is FeatureFlag => flag !== null,
    )
  }

  async paginate(
    options: PaginationOptionsInterface,
    projectId: string,
    search?: string,
  ): Promise<Pagination<FeatureFlag>> {
    // ClickHouse expects UInt32 for LIMIT/OFFSET in these queries; clamp to avoid
    // user-provided negatives causing query failures (and potential 500s).
    const take =
      typeof options.take === 'number' && Number.isFinite(options.take)
        ? Math.min(Math.max(options.take, 0), 100)
        : 100
    const skip =
      typeof options.skip === 'number' && Number.isFinite(options.skip)
        ? Math.max(options.skip, 0)
        : 0

    const searchCondition = search?.trim()
      ? `AND (lower(key) LIKE {search:String} OR lower(description) LIKE {search:String})`
      : ''

    const countQuery = `
      SELECT count() as total 
      FROM feature_flag 
      WHERE projectId = {projectId:FixedString(12)}
      ${searchCondition}
    `

    const dataQuery = `
      SELECT * FROM feature_flag 
      WHERE projectId = {projectId:FixedString(12)}
      ${searchCondition}
      ORDER BY key ASC
      LIMIT {take:UInt32} OFFSET {skip:UInt32}
    `

    const queryParams: Record<string, any> = { projectId, take, skip }
    if (search?.trim()) {
      queryParams.search = `%${search.trim().toLowerCase()}%`
    }

    const [countResult, dataResult] = await Promise.all([
      clickhouse
        .query({
          query: countQuery,
          query_params: queryParams,
        })
        .then((resultSet) => resultSet.json<{ total: number }>()),
      clickhouse
        .query({
          query: dataQuery,
          query_params: queryParams,
        })
        .then((resultSet) => resultSet.json<ClickhouseFeatureFlag>()),
    ])

    const total = countResult.data[0]?.total || 0
    const results = _map(dataResult.data, (flag) =>
      this.formatFlagFromClickhouse(flag),
    ).filter((flag): flag is FeatureFlag => flag !== null)

    return new Pagination<FeatureFlag>({
      results,
      total,
    })
  }

  async count(projectId: string): Promise<number> {
    const query = `
      SELECT count() as total 
      FROM feature_flag 
      WHERE projectId = {projectId:FixedString(12)}
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { projectId },
      })
      .then((resultSet) => resultSet.json<{ total: number }>())

    return data[0]?.total || 0
  }

  async create(flagData: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const id = randomUUID()
    const created = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')

    const enabled = flagData.enabled ?? true
    const flagType = flagData.flagType || FeatureFlagType.BOOLEAN
    const rolloutPercentage = flagData.rolloutPercentage ?? 100
    const description = flagData.description || null
    const targetingRules = flagData.targetingRules || null

    const formattedFlag = this.formatFlagToClickhouse({
      ...flagData,
      enabled,
    })

    await clickhouse.insert({
      table: 'feature_flag',
      format: 'JSONEachRow',
      values: [
        {
          id,
          key: formattedFlag.key,
          description: formattedFlag.description || null,
          flagType: formattedFlag.flagType || FeatureFlagType.BOOLEAN,
          rolloutPercentage: formattedFlag.rolloutPercentage ?? 100,
          targetingRules: formattedFlag.targetingRules || null,
          enabled: formattedFlag.enabled ?? 1,
          projectId: flagData.projectId,
          created,
        },
      ],
    })

    // Return the constructed FeatureFlag directly instead of re-querying ClickHouse.
    // ClickHouse is eventually consistent, so findOne(id) may not return the newly
    // inserted record immediately after insert.
    return {
      id,
      key: flagData.key,
      description,
      flagType,
      rolloutPercentage,
      targetingRules,
      enabled,
      projectId: flagData.projectId,
      created,
    }
  }

  async update(
    id: string,
    flagData: Partial<FeatureFlag>,
  ): Promise<FeatureFlag> {
    // Fetch the existing flag first to merge with updates
    // This avoids read-after-write issues since ClickHouse mutations are async
    const existingFlag = await this.findOne(id)

    if (!existingFlag) {
      return null
    }

    const filtered = _reduce(
      _filter(
        _keys(flagData),
        (key) =>
          ALLOWED_FLAG_KEYS.includes(key) &&
          flagData[key as keyof FeatureFlag] !== undefined,
      ),
      (obj, key) => {
        obj[key] = flagData[key as keyof FeatureFlag]
        return obj
      },
      {} as Record<string, any>,
    )

    const columns = _keys(filtered)

    if (_isEmpty(columns)) {
      return existingFlag
    }

    const formattedData = this.formatFlagToClickhouse(
      filtered as Partial<FeatureFlag>,
    )

    const params: Record<string, any> = { id }

    const assignments = _map(columns, (col) => {
      const value = formattedData[col as keyof ClickhouseFeatureFlag]
      params[col] = value

      if (col === 'enabled') {
        return `${col}={${col}:Int8}`
      }

      if (col === 'rolloutPercentage') {
        return `${col}={${col}:UInt8}`
      }

      // Handle nullable string columns
      if (
        value === null &&
        (col === 'description' || col === 'targetingRules')
      ) {
        return `${col}=NULL`
      }

      return `${col}={${col}:String}`
    }).join(', ')

    const query = `ALTER TABLE feature_flag UPDATE ${assignments} WHERE id={id:String}`

    await clickhouse.command({
      query,
      query_params: params,
    })

    // Return the merged entity locally instead of re-querying
    // ClickHouse mutations are async, so findOne might return stale data
    return {
      ...existingFlag,
      ...(filtered as Partial<FeatureFlag>),
    }
  }

  async delete(id: string): Promise<void> {
    const query = `ALTER TABLE feature_flag DELETE WHERE id = {id:String}`

    await clickhouse.command({
      query,
      query_params: { id },
    })
  }

  async deleteByProject(projectId: string): Promise<void> {
    const query = `ALTER TABLE feature_flag DELETE WHERE projectId = {projectId:FixedString(12)}`

    await clickhouse.command({
      query,
      query_params: { projectId },
    })
  }

  /**
   * Evaluates all feature flags for a project given visitor attributes
   */
  evaluateFlags(
    flags: FeatureFlag[],
    profileId: string,
    attributes?: Record<string, string>,
  ): Record<string, boolean> {
    return sharedEvaluateFlags(flags, profileId, attributes)
  }

  /**
   * Evaluates a single feature flag for a visitor
   */
  evaluateFlag(
    flag: FeatureFlag,
    profileId: string,
    attributes?: Record<string, string>,
  ): boolean {
    return sharedEvaluateFlag(flag, profileId, attributes)
  }
}
