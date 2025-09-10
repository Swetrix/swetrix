import { Injectable } from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import _omit from 'lodash/omit'
import { clickhouse } from '../common/integrations/clickhouse'
import { User, type ClickhouseInputUser } from '../common/types'
import {
  DEFAULT_TIMEZONE,
  OnboardingStep,
  TimeFormat,
} from './entities/user.entity'

@Injectable()
export class UserService {
  async findOne(options: Partial<ClickhouseInputUser>) {
    const paramTypes: Record<keyof ClickhouseInputUser, string> = {
      id: 'FixedString(36)',
      email: 'String',
      password: 'String',
      timezone: 'String',
      timeFormat: 'String',
      showLiveVisitorsInTitle: 'Int8',
      onboardingStep: 'String',
      hasCompletedOnboarding: 'Int8',
      apiKey: 'String',
    }

    const entries = Object.entries(options).filter(
      ([key, value]) => key in paramTypes && value !== undefined,
    ) as [keyof ClickhouseInputUser, unknown][]

    const conditions: string[] = []
    const queryParams: Record<string, unknown> = {}

    for (const [key, value] of entries) {
      if (value === null) {
        conditions.push(`${String(key)} IS NULL`)
      } else {
        conditions.push(`${String(key)} = {${String(key)}:${paramTypes[key]}}`)
        queryParams[String(key)] = value
      }
    }

    const where = conditions.length > 0 ? conditions.join(' AND ') : '1'

    const { data } = await clickhouse
      .query({
        query: `SELECT * FROM user WHERE ${where}`,
        query_params: queryParams,
      })
      .then(resultSet => resultSet.json<ClickhouseInputUser>())

    return this.formatUser(data[0])
  }

  async update(userId: string, update: Partial<ClickhouseInputUser>) {
    const allowedKeys: Array<keyof ClickhouseInputUser> = [
      'email',
      'password',
      'timezone',
      'timeFormat',
      'showLiveVisitorsInTitle',
      'onboardingStep',
      'hasCompletedOnboarding',
      'apiKey',
    ]

    const rawEntries = Object.entries(update) as [
      keyof ClickhouseInputUser,
      unknown,
    ][]
    const entries = rawEntries.filter(
      ([key, value]) => allowedKeys.includes(key) && value !== undefined,
    )

    if (entries.length === 0) {
      return this.findOne({ id: userId })
    }

    const assignments: string[] = []
    const queryParams: Record<string, unknown> = {}

    for (const [key, value] of entries) {
      // Support explicit clearing of the nullable apiKey column
      if (value === null) {
        if (key === 'apiKey') {
          assignments.push('apiKey = NULL')
        }
        continue
      }

      const type = [
        'showLiveVisitorsInTitle',
        'hasCompletedOnboarding',
      ].includes(key)
        ? 'Int8'
        : 'String'

      assignments.push(`${String(key)} = {${String(key)}:${type}}`)
      queryParams[String(key)] = value
    }

    if (assignments.length === 0) {
      return this.findOne({ id: userId })
    }

    const query = `ALTER TABLE user UPDATE ${assignments.join(
      ', ',
    )} WHERE id = {id:FixedString(36)}`

    await clickhouse.command({
      query,
      query_params: {
        ...queryParams,
        id: userId,
      },
    })

    return this.findOne({ id: userId })
  }

  async create(user: Pick<ClickhouseInputUser, 'email' | 'password'>) {
    const id = uuidv4()

    await clickhouse.insert({
      table: 'user',
      format: 'JSONEachRow',
      values: [
        {
          id,
          email: user.email || '',
          password: user.password || '',
          timezone: DEFAULT_TIMEZONE,
          timeFormat: TimeFormat['24-hour'],
          showLiveVisitorsInTitle: 0,
          onboardingStep: OnboardingStep.CREATE_PROJECT,
          hasCompletedOnboarding: 0,
          apiKey: null,
        },
      ],
    })

    return this.findOne({ id })
  }

  async count() {
    const { data } = await clickhouse
      .query({
        query: 'SELECT count() as total FROM user',
      })
      .then(resultSet => resultSet.json<{ total: number }>())

    const total = Array.isArray(data) && data.length > 0 ? data[0].total : 0
    return Number(total) || 0
  }

  omitSensitiveData(user: Partial<User>): Partial<User> {
    return _omit(user, ['password'])
  }

  formatUser(user?: ClickhouseInputUser): User {
    if (!user) {
      return undefined
    }

    return {
      ...user,
      showLiveVisitorsInTitle: Boolean(user.showLiveVisitorsInTitle),
      hasCompletedOnboarding: Boolean(user.hasCompletedOnboarding),
    }
  }
}
