import {
  ForbiddenException,
  Injectable,
  BadRequestException,
  UnprocessableEntityException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common'
import * as _isEmpty from 'lodash/isEmpty'
import * as _isString from 'lodash/isString'
import * as _size from 'lodash/size'
import * as _join from 'lodash/join'
import * as _find from 'lodash/find'
import * as _map from 'lodash/map'
import * as _pick from 'lodash/pick'
import * as _isNull from 'lodash/isNull'
import * as _split from 'lodash/split'
import * as _trim from 'lodash/trim'
import * as _findIndex from 'lodash/findIndex'
// @ts-ignore
import * as validateIP from 'validate-ip-node'

import { Project } from './entity/project.entity'
import { ProjectDTO } from './dto/project.dto'
import {
  isValidPID,
  redis,
  clickhouse,
  IP_REGEX,
  ORIGINS_REGEX,
  getRedisProjectKey,
  redisProjectCacheTimeout,
} from '../common/constants'
import { getProjectsClickhouse } from '../common/utils'

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
  constructor() {}

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

  allowedToView(project: Project, uid: string | null): void {
    if (project.public || uid) {
      return null
    }

    throw new ForbiddenException(
      `You are not allowed to view "${project?.name}" project`,
    )
  }

  checkIfIDUniqueClickhouse(projects: Array<object>, projectID: string): void {
    if (_find(projects, ({ id }) => id === projectID)) {
      throw new BadRequestException('Selected project ID is already in use')
    }
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

    await Promise.all([
      clickhouse.query(queryAnalytics, params).toPromise(),
      clickhouse.query(queryCustomEvents, params).toPromise(),
      clickhouse.query(queryPerformance, params).toPromise(),
    ])
  }

  formatToClickhouse(project: any): object {
    const updProject = { ...project }
    updProject.active = Number(updProject.active)
    updProject.public = Number(updProject.public)

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

    updProject.origins = _isNull(updProject.origins)
      ? []
      : _split(updProject.origins, ',')

    updProject.ipBlacklist = _isNull(updProject.ipBlacklist)
      ? []
      : _split(updProject.ipBlacklist, ',')

    return updProject
  }

  validateProject(projectDTO: ProjectDTO) {
    if (!isValidPID(projectDTO.id))
      throw new UnprocessableEntityException(
        'The provided Project ID (pid) is incorrect',
      )
    if (_size(projectDTO.name) > 50)
      throw new UnprocessableEntityException('The project name is too long')
    if (_size(_join(projectDTO.origins, ',')) > 300)
      throw new UnprocessableEntityException(
        'The list of allowed origins has to be smaller than 300 symbols',
      )
    if (_size(_join(projectDTO.ipBlacklist, ',')) > 300)
      throw new UnprocessableEntityException(
        'The list of allowed blacklisted IP addresses must be less than 300 characters.',
      )

    _map(projectDTO.origins, host => {
      if (!ORIGINS_REGEX.test(_trim(host))) {
        throw new ConflictException(`Host ${host} is not correct`)
      }
    })

    _map(projectDTO.ipBlacklist, ip => {
      if (!validateIP(_trim(ip)) && !IP_REGEX.test(_trim(ip))) {
        throw new ConflictException(`IP address ${ip} is not correct`)
      }
    })
  }
}
