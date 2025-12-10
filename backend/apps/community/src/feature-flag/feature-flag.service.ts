import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import * as crypto from 'crypto'
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
  formatFlagFromClickhouse(flag: ClickhouseFeatureFlag): FeatureFlag {
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
    const query = `SELECT * FROM feature_flag WHERE id = {id:String}`

    const { data } = await clickhouse
      .query({
        query,
        query_params: { id },
      })
      .then(resultSet => resultSet.json<ClickhouseFeatureFlag>())

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
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { projectId, key },
      })
      .then(resultSet => resultSet.json<ClickhouseFeatureFlag>())

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
      .then(resultSet => resultSet.json<ClickhouseFeatureFlag>())

    return _map(data, flag => this.formatFlagFromClickhouse(flag))
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
      .then(resultSet => resultSet.json<ClickhouseFeatureFlag>())

    return _map(data, flag => this.formatFlagFromClickhouse(flag))
  }

  async paginate(
    options: PaginationOptionsInterface,
    projectId: string,
  ): Promise<Pagination<FeatureFlag>> {
    const take = options.take || 100
    const skip = options.skip || 0

    const countQuery = `
      SELECT count() as total 
      FROM feature_flag 
      WHERE projectId = {projectId:FixedString(12)}
    `

    const dataQuery = `
      SELECT * FROM feature_flag 
      WHERE projectId = {projectId:FixedString(12)}
      ORDER BY key ASC
      LIMIT {take:UInt32} OFFSET {skip:UInt32}
    `

    const [countResult, dataResult] = await Promise.all([
      clickhouse
        .query({
          query: countQuery,
          query_params: { projectId },
        })
        .then(resultSet => resultSet.json<{ total: number }>()),
      clickhouse
        .query({
          query: dataQuery,
          query_params: { projectId, take, skip },
        })
        .then(resultSet => resultSet.json<ClickhouseFeatureFlag>()),
    ])

    const total = countResult.data[0]?.total || 0
    const results = _map(dataResult.data, flag =>
      this.formatFlagFromClickhouse(flag),
    )

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
      .then(resultSet => resultSet.json<{ total: number }>())

    return data[0]?.total || 0
  }

  async create(flagData: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const id = randomUUID()
    const created = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')

    const formattedFlag = this.formatFlagToClickhouse({
      ...flagData,
      enabled: flagData.enabled ?? true,
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

    return this.findOne(id)
  }

  async update(
    id: string,
    flagData: Partial<FeatureFlag>,
  ): Promise<FeatureFlag> {
    const filtered = _reduce(
      _filter(
        _keys(flagData),
        key =>
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
      return this.findOne(id)
    }

    const formattedData = this.formatFlagToClickhouse(
      filtered as Partial<FeatureFlag>,
    )

    const params: Record<string, any> = { id }

    const assignments = _map(columns, col => {
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

    return this.findOne(id)
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
    const result: Record<string, boolean> = {}

    for (const flag of flags) {
      result[flag.key] = this.evaluateFlag(flag, profileId, attributes)
    }

    return result
  }

  /**
   * Evaluates a single feature flag for a visitor
   */
  evaluateFlag(
    flag: FeatureFlag,
    profileId: string,
    attributes?: Record<string, string>,
  ): boolean {
    // If flag is disabled, always return false
    if (!flag.enabled) {
      return false
    }

    // Check targeting rules if any exist
    if (flag.targetingRules && flag.targetingRules.length > 0) {
      const matchesTargeting = this.matchesTargetingRules(
        flag.targetingRules,
        attributes,
      )
      if (!matchesTargeting) {
        return false
      }
    }

    // For boolean flags, return true if enabled and targeting matches
    if (flag.flagType === FeatureFlagType.BOOLEAN) {
      return true
    }

    // For rollout flags, use percentage-based rollout
    if (flag.flagType === FeatureFlagType.ROLLOUT) {
      return this.isInRolloutPercentage(
        flag.key,
        flag.rolloutPercentage,
        profileId,
      )
    }

    return false
  }

  /**
   * Checks if visitor attributes match the targeting rules
   * Rules are evaluated as AND (all rules must match)
   */
  private matchesTargetingRules(
    rules: TargetingRule[],
    attributes?: Record<string, string>,
  ): boolean {
    if (!attributes) {
      // If no attributes provided, we can't match any rules
      // Return true to be permissive (flag will be shown)
      return true
    }

    for (const rule of rules) {
      const attributeValue = attributes[rule.column]

      // Check if we have the attribute
      if (attributeValue === undefined) {
        // If attribute not provided, skip this rule (be permissive)
        continue
      }

      const matches = this.matchesRule(attributeValue, rule.filter)

      // If isExclusive (exclude), we want the rule to NOT match
      // If not isExclusive (include), we want the rule to match
      if (rule.isExclusive) {
        // Exclude: if it matches, targeting fails
        if (matches) {
          return false
        }
      } else {
        // Include: if it doesn't match, targeting fails
        if (!matches) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Checks if an attribute value matches a filter value
   * Supports case-insensitive matching
   */
  private matchesRule(attributeValue: string, filterValue: string): boolean {
    // Case-insensitive exact match
    return attributeValue.toLowerCase() === filterValue.toLowerCase()
  }

  /**
   * Determines if a visitor is within the rollout percentage
   * Uses consistent hashing based on flag key and profile ID
   */
  private isInRolloutPercentage(
    flagKey: string,
    percentage: number,
    profileId: string,
  ): boolean {
    if (percentage >= 100) {
      return true
    }
    if (percentage <= 0) {
      return false
    }

    // Create a consistent hash based on flag key and profile ID
    const hash = crypto
      .createHash('md5')
      .update(`${flagKey}:${profileId}`)
      .digest('hex')

    // Convert first 8 hex characters to a number (0 to 2^32-1)
    const hashValue = parseInt(hash.substring(0, 8), 16)

    // Normalize to 0-100 range
    const normalizedValue = (hashValue / 0xffffffff) * 100

    return normalizedValue < percentage
  }
}
