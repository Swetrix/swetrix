import * as net from 'net'
import {
  ForbiddenException,
  Injectable,
  BadRequestException,
  UnprocessableEntityException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common'
import { customAlphabet } from 'nanoid'
import * as _isEmpty from 'lodash/isEmpty'
import * as _isString from 'lodash/isString'
import * as _size from 'lodash/size'
import * as _join from 'lodash/join'
import * as _find from 'lodash/find'
import * as _map from 'lodash/map'
import * as _isNull from 'lodash/isNull'
import * as _split from 'lodash/split'
import * as _trim from 'lodash/trim'
import * as _reduce from 'lodash/reduce'
import { compareSync } from 'bcrypt'

import { Project } from './entity/project.entity'
import { ProjectDTO } from './dto/project.dto'
import {
  isValidPID,
  redis,
  IP_REGEX,
  ORIGINS_REGEX,
  getRedisProjectKey,
  redisProjectCacheTimeout,
} from '../common/constants'
import { clickhouse } from '../common/integrations/clickhouse'
import { getProjectsClickhouse } from '../common/utils'
import { MAX_PROJECT_PASSWORD_LENGTH, UpdateProjectDto } from './dto'
import { Funnel } from './entity/funnel.entity'

// A list of characters that can be used in a Project ID
const LEGAL_PID_CHARACTERS =
  '1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm'
export const generateProjectId = customAlphabet(LEGAL_PID_CHARACTERS, 12)

export const deleteProjectRedis = async (id: string) => {
  const key = getRedisProjectKey(id)

  try {
    await redis.del(key)
  } catch (e) {
    console.error(`Error deleting project ${id} from redis: ${e}`)
  }
}

@Injectable()
export class ProjectService {
  async getRedisProject(pid: string): Promise<Project | null> {
    const pidKey = getRedisProjectKey(pid)
    let project: string | Project = await redis.get(pidKey)

    if (_isEmpty(project)) {
      project = this.formatFromClickhouse(await getProjectsClickhouse(pid))

      if (_isEmpty(project))
        throw new BadRequestException(
          'The provided Project ID (pid) is incorrect',
        )

      await redis.set(
        pidKey,
        JSON.stringify(project),
        'EX',
        redisProjectCacheTimeout,
      )
    } else {
      try {
        project = JSON.parse(project)
      } catch {
        throw new InternalServerErrorException('Error while processing project')
      }
    }

    // @ts-ignore
    return project
  }

  allowedToView(
    project: Project,
    uid: string | null,
    password?: string | null,
  ): void {
    if (project.isPasswordProtected && password) {
      if (
        _size(password) <= MAX_PROJECT_PASSWORD_LENGTH &&
        compareSync(password, project.passwordHash)
      ) {
        return null
      }

      throw new ConflictException('Incorrect password')
    }

    if (project.public || uid) {
      return null
    }

    throw new ForbiddenException('You are not allowed to view this project')
  }

  isPIDUnique(projects: Array<object>, pid: string): boolean {
    return !_find(projects, ({ id }) => id === pid)
  }

  checkIfIDUnique(projects: Array<object>, pid: string): void {
    const isUnique = this.isPIDUnique(projects, pid)

    if (!isUnique) {
      throw new BadRequestException('Selected project ID is already in use')
    }
  }

  async getPIDsWhereAnalyticsDataExists(
    projectIds: string[],
  ): Promise<string[]> {
    if (_isEmpty(projectIds)) {
      return []
    }

    const params = _reduce(
      projectIds,
      (acc, curr, index) => ({
        ...acc,
        [`pid_${index}`]: curr,
      }),
      {},
    )

    const pids = _join(
      _map(params, (val, key) => `{${key}:FixedString(12)}`),
      ',',
    )

    const query = `
      SELECT
        pid,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM analytics
            WHERE pid IN (${pids})
          )
          OR EXISTS (
            SELECT 1
            FROM customEV
            WHERE pid IN (${pids})
          )
          THEN 1
          ELSE 0
        END AS exists
      FROM
      (
        SELECT DISTINCT pid
        FROM
        (
          SELECT pid
          FROM analytics
          WHERE pid IN (${pids})
          UNION ALL
          SELECT pid
          FROM customEV
          WHERE pid IN (${pids})
        ) AS t
      );
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: params,
      })
      .then(resultSet => resultSet.json())

    return _map(data, ({ pid }) => pid)
  }

  async getPIDsWhereErrorsDataExists(projectIds: string[]): Promise<string[]> {
    if (_isEmpty(projectIds)) {
      return []
    }

    const params = _reduce(
      projectIds,
      (acc, curr, index) => ({
        ...acc,
        [`pid_${index}`]: curr,
      }),
      {},
    )

    const pids = _join(
      _map(params, (val, key) => `{${key}:FixedString(12)}`),
      ',',
    )

    const query = `
      SELECT
        pid,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM errors
            WHERE pid IN (${pids})
          )
          THEN 1
          ELSE 0
        END AS exists
      FROM
      (
        SELECT DISTINCT pid
        FROM errors
        WHERE pid IN (${pids})
      );
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: params,
      })
      .then(resultSet => resultSet.json())

    return _map(data, ({ pid }) => pid)
  }

  async removeDataFromClickhouse(
    pid: string,
    from: string,
    to: string,
  ): Promise<void> {
    const queryAnalytics =
      'ALTER TABLE analytics DELETE WHERE pid = {pid:FixedString(12)} AND created BETWEEN {from:String} AND {to:String}'
    const queryCustomEvents =
      'ALTER TABLE customEV DELETE WHERE pid = {pid:FixedString(12)} AND created BETWEEN {from:String} AND {to:String}'
    const queryPerformance =
      'ALTER TABLE performance DELETE WHERE pid = {pid:FixedString(12)} AND created BETWEEN {from:String} AND {to:String}'
    const params = {
      params: {
        pid,
        from,
        to,
      },
    }

    await clickhouse.query({
      query: queryAnalytics,
      query_params: params,
    })
    await clickhouse.query({
      query: queryCustomEvents,
      query_params: params,
    })
    await clickhouse.query({
      query: queryPerformance,
      query_params: params,
    })
  }

  formatToClickhouse(project: any): object {
    const updProject = { ...project }
    updProject.active = Number(updProject.active)
    updProject.public = Number(updProject.public)
    updProject.isPasswordProtected = Number(updProject.isPasswordProtected)

    if (!_isNull(updProject.origins)) {
      updProject.origins = _isString(updProject.origins)
        ? updProject.origins
        : _join(updProject.origins, ',')
    }

    if (!_isNull(updProject.ipBlacklist)) {
      updProject.ipBlacklist = _isString(updProject.ipBlacklist)
        ? updProject.ipBlacklist
        : _join(updProject.ipBlacklist, ',')
    }

    return updProject
  }

  formatFromClickhouse(project: any): Project {
    const updProject = { ...project }
    updProject.active = Boolean(updProject.active)
    updProject.public = Boolean(updProject.public)
    updProject.isPasswordProtected = Boolean(updProject.isPasswordProtected)

    updProject.origins = _isNull(updProject.origins)
      ? []
      : _split(updProject.origins, ',')

    updProject.ipBlacklist = _isNull(updProject.ipBlacklist)
      ? []
      : _split(updProject.ipBlacklist, ',')

    return updProject
  }

  formatFunnelToClickhouse(funnel: Funnel): any {
    const updFunnel = { ...funnel }
    updFunnel.name = _trim(funnel.name)
    updFunnel.steps = _isString(updFunnel.steps)
      ? updFunnel.steps
      : _join(updFunnel.steps, ',')

    return updFunnel
  }

  formatFunnelsFromClickhouse(funnels: any[]): Funnel[] {
    if (_isEmpty(funnels)) {
      return []
    }

    return _map(funnels, this.formatFunnelFromClickhouse)
  }

  formatFunnelFromClickhouse(funnel: any): Funnel {
    const updFunnel = { ...funnel }

    updFunnel.steps = _isNull(updFunnel.steps)
      ? []
      : _split(updFunnel.steps, ',')

    return updFunnel
  }

  validateOrigins(projectDTO: ProjectDTO | UpdateProjectDto) {
    if (_size(_join(projectDTO.origins, ',')) > 300)
      throw new UnprocessableEntityException(
        'The list of allowed origins has to be smaller than 300 symbols',
      )

    _map(projectDTO.origins, host => {
      if (!ORIGINS_REGEX.test(_trim(host))) {
        throw new ConflictException(`Host ${host} is not correct`)
      }
    })
  }

  validateIPBlacklist(projectDTO: ProjectDTO | UpdateProjectDto) {
    if (_size(_join(projectDTO.ipBlacklist, ',')) > 300)
      throw new UnprocessableEntityException(
        'The list of allowed blacklisted IP addresses must be less than 300 characters.',
      )
    _map(projectDTO.ipBlacklist, ip => {
      if (!net.isIP(_trim(ip)) && !IP_REGEX.test(_trim(ip))) {
        throw new ConflictException(`IP address ${ip} is not correct`)
      }
    })
  }

  validateProject(
    projectDTO: ProjectDTO | UpdateProjectDto,
    creatingProject = false,
  ) {
    if (_size(projectDTO.name) > 50)
      throw new UnprocessableEntityException('The project name is too long')

    if (creatingProject) {
      return
    }

    if (projectDTO?.id && !isValidPID(projectDTO.id))
      throw new UnprocessableEntityException(
        'The provided Project ID (pid) is incorrect',
      )

    this.validateOrigins(projectDTO)
    this.validateIPBlacklist(projectDTO)
  }
}
