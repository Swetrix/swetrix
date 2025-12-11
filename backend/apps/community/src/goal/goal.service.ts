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
  Goal,
  ClickhouseGoal,
  GoalMatchType,
  MetadataFilter,
} from './entity/goal.entity'
import { Pagination } from '../common/pagination/pagination'
import { PaginationOptionsInterface } from '../common/pagination/pagination.results.interface'

dayjs.extend(utc)

const ALLOWED_GOAL_KEYS = [
  'name',
  'type',
  'matchType',
  'value',
  'metadataFilters',
  'active',
]

@Injectable()
export class GoalService {
  formatGoalFromClickhouse(goal: ClickhouseGoal): Goal {
    if (!goal) {
      return null
    }

    let metadataFilters: MetadataFilter[] | null = null
    if (goal.metadataFilters) {
      try {
        metadataFilters = JSON.parse(goal.metadataFilters)
      } catch {
        metadataFilters = null
      }
    }

    return {
      id: goal.id,
      name: goal.name,
      type: goal.type as Goal['type'],
      matchType: (goal.matchType as GoalMatchType) || GoalMatchType.EXACT,
      value: goal.value,
      metadataFilters,
      active: Boolean(goal.active),
      projectId: goal.projectId,
      created: goal.created,
    }
  }

  formatGoalToClickhouse(goal: Partial<Goal>): Partial<ClickhouseGoal> {
    const result: Partial<ClickhouseGoal> = { ...goal } as any

    if (goal.metadataFilters !== undefined) {
      result.metadataFilters = goal.metadataFilters
        ? JSON.stringify(goal.metadataFilters)
        : null
    }

    if (goal.active !== undefined) {
      result.active = goal.active ? 1 : 0
    }

    return result
  }

  async findOne(id: string): Promise<Goal | null> {
    const query = `SELECT * FROM goal WHERE id = {id:FixedString(36)}`

    const { data } = await clickhouse
      .query({
        query,
        query_params: { id },
      })
      .then(resultSet => resultSet.json<ClickhouseGoal>())

    if (_isEmpty(data)) {
      return null
    }

    return this.formatGoalFromClickhouse(_head(data))
  }

  async findOneWithProject(id: string): Promise<Goal | null> {
    return this.findOne(id)
  }

  async findByProject(projectId: string): Promise<Goal[]> {
    const query = `
      SELECT * FROM goal 
      WHERE projectId = {projectId:FixedString(12)} 
      AND active = 1
      ORDER BY name ASC
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: { projectId },
      })
      .then(resultSet => resultSet.json<ClickhouseGoal>())

    return _map(data, goal => this.formatGoalFromClickhouse(goal))
  }

  async paginate(
    options: PaginationOptionsInterface,
    projectId: string,
  ): Promise<Pagination<Goal>> {
    const take = options.take || 100
    const skip = options.skip || 0

    const countQuery = `
      SELECT count() as total 
      FROM goal 
      WHERE projectId = {projectId:FixedString(12)}
    `

    const dataQuery = `
      SELECT * FROM goal 
      WHERE projectId = {projectId:FixedString(12)}
      ORDER BY name ASC
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
        .then(resultSet => resultSet.json<ClickhouseGoal>()),
    ])

    const total = countResult.data[0]?.total || 0
    const results = _map(dataResult.data, goal =>
      this.formatGoalFromClickhouse(goal),
    )

    return new Pagination<Goal>({
      results,
      total,
    })
  }

  async count(projectId: string): Promise<number> {
    const query = `
      SELECT count() as total 
      FROM goal 
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

  async create(goalData: Partial<Goal>): Promise<Goal> {
    const id = randomUUID()
    const created = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')

    const formattedGoal = this.formatGoalToClickhouse({
      ...goalData,
      active: goalData.active ?? true,
    })

    await clickhouse.insert({
      table: 'goal',
      format: 'JSONEachRow',
      values: [
        {
          id,
          name: formattedGoal.name,
          type: formattedGoal.type,
          matchType: formattedGoal.matchType || GoalMatchType.EXACT,
          value: formattedGoal.value || null,
          metadataFilters: formattedGoal.metadataFilters || null,
          active: formattedGoal.active ?? 1,
          projectId: goalData.projectId,
          created,
        },
      ],
    })

    return this.findOne(id)
  }

  async update(id: string, goalData: Partial<Goal>): Promise<Goal> {
    const filtered = _reduce(
      _filter(
        _keys(goalData),
        key =>
          ALLOWED_GOAL_KEYS.includes(key) &&
          goalData[key as keyof Goal] !== undefined,
      ),
      (obj, key) => {
        obj[key] = goalData[key as keyof Goal]
        return obj
      },
      {} as Record<string, any>,
    )

    const columns = _keys(filtered)

    if (_isEmpty(columns)) {
      return this.findOne(id)
    }

    const formattedData = this.formatGoalToClickhouse(filtered as Partial<Goal>)

    const params: Record<string, any> = { id }

    const assignments = _map(columns, col => {
      const value = formattedData[col as keyof ClickhouseGoal]
      params[col] = value

      if (col === 'active') {
        return `${col}={${col}:Int8}`
      }

      // Handle nullable string columns
      if (value === null && (col === 'value' || col === 'metadataFilters')) {
        return `${col}=NULL`
      }

      return `${col}={${col}:String}`
    }).join(', ')

    const query = `ALTER TABLE goal UPDATE ${assignments} WHERE id={id:FixedString(36)}`

    await clickhouse.command({
      query,
      query_params: params,
    })

    return this.findOne(id)
  }

  async delete(id: string): Promise<void> {
    const query = `ALTER TABLE goal DELETE WHERE id = {id:FixedString(36)}`

    await clickhouse.command({
      query,
      query_params: { id },
    })
  }

  async deleteByProject(projectId: string): Promise<void> {
    const query = `ALTER TABLE goal DELETE WHERE projectId = {projectId:FixedString(12)}`

    await clickhouse.command({
      query,
      query_params: { projectId },
    })
  }
}
