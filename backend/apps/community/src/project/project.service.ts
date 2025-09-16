import net from 'net'
import {
  ForbiddenException,
  Injectable,
  BadRequestException,
  UnprocessableEntityException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common'
import _isEmpty from 'lodash/isEmpty'
import _isString from 'lodash/isString'
import _size from 'lodash/size'
import _join from 'lodash/join'
import _filter from 'lodash/filter'
import _includes from 'lodash/includes'
import _find from 'lodash/find'
import _map from 'lodash/map'
import _isNull from 'lodash/isNull'
import _split from 'lodash/split'
import _trim from 'lodash/trim'
import _reduce from 'lodash/reduce'
import _findIndex from 'lodash/findIndex'
import { compareSync } from 'bcrypt'

import { Project, ProjectWithShare, Role } from './entity/project.entity'
import { ProjectDTO } from './dto/project.dto'
import {
  isValidPID,
  redis,
  IP_REGEX,
  ORIGINS_REGEX,
  getRedisProjectKey,
  redisProjectCacheTimeout,
  ALL_COLUMNS,
  TRAFFIC_METAKEY_COLUMNS,
} from '../common/constants'
import { clickhouse } from '../common/integrations/clickhouse'
import {
  findProjectSharesByProjectClickhouse,
  getProjectClickhouse,
} from '../common/utils'
import { MAX_PROJECT_PASSWORD_LENGTH, UpdateProjectDto } from './dto'
import { Funnel } from './entity/funnel.entity'
import { ProjectViewEntity } from './entity/project-view.entity'
import {
  CreateProjectViewDto,
  Filter,
  ProjectViewCustomEventDto,
} from './dto/create-project-view.dto'
import { ProjectViewCustomEventEntity } from './entity/project-view-custom-event.entity'
import { ClickhouseFunnel } from '../common/types'

// A list of characters that can be used in a Project ID
export const LEGAL_PID_CHARACTERS =
  '1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm'
export const PID_LENGTH = 12

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
  async getRedisProject(pid: string) {
    const pidKey = getRedisProjectKey(pid)
    let project: string | Project = await redis.get(pidKey)

    if (_isEmpty(project)) {
      project = this.formatFromClickhouse(await getProjectClickhouse(pid))

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

    return project as ProjectWithShare | null
  }

  allowedToView(
    project: ProjectWithShare,
    uid: string | null,
    password?: string | null,
  ): void {
    if (
      project.public ||
      uid === project.adminId ||
      _findIndex(project.share, ({ user }) => user?.id === uid) !== -1
    ) {
      return null
    }

    if (project.isPasswordProtected && password) {
      if (
        _size(password) <= MAX_PROJECT_PASSWORD_LENGTH &&
        compareSync(password, project.passwordHash)
      ) {
        return null
      }

      throw new ConflictException('Incorrect password')
    }

    if (project.isPasswordProtected) {
      throw new ForbiddenException('This project is password protected')
    }

    throw new ForbiddenException('You are not allowed to view this project')
  }

  // Instead of passing relations to the findOne method every time, this method returns a project
  // with necessary relations needed for the allowedToView and allowedToManage methods
  async getFullProject(pid: string): Promise<ProjectWithShare | null> {
    const project = await getProjectClickhouse(pid)

    if (_isEmpty(project)) {
      return null
    }

    const shares = await findProjectSharesByProjectClickhouse(pid)
    const share = (shares || []).map((row: any) => ({
      id: row.id,
      role: row.role,
      confirmed: Boolean(row.confirmed),
      user: {
        id: row.userId,
        email: row.email,
      },
    }))

    return {
      ...project,
      share,
    }
  }

  allowedToManage(
    project: ProjectWithShare,
    uid: string,
    message = 'You are not allowed to manage this project',
  ): void {
    if (
      uid === project.adminId ||
      _findIndex(
        project.share,
        share => share.user?.id === uid && share.role === Role.admin,
      ) !== -1
    ) {
      return null
    }

    throw new ForbiddenException(message)
  }

  isPIDUnique(projects: Project[], pid: string): boolean {
    return !_find(projects, ({ id }) => id === pid)
  }

  checkIfIDUnique(projects: Project[], pid: string): void {
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
      .then(resultSet => resultSet.json<{ pid: string }>())

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
      .then(resultSet => resultSet.json<{ pid: string }>())

    return _map(data, ({ pid }) => pid)
  }

  async removeDataFromClickhouse(
    pid: string,
    from: string,
    to: string,
  ): Promise<void> {
    const queries = [
      'ALTER TABLE analytics DELETE WHERE pid = {pid:FixedString(12)} AND created BETWEEN {from:String} AND {to:String}',
      'ALTER TABLE customEV DELETE WHERE pid = {pid:FixedString(12)} AND created BETWEEN {from:String} AND {to:String}',
      'ALTER TABLE performance DELETE WHERE pid = {pid:FixedString(12)} AND created BETWEEN {from:String} AND {to:String}',
      'ALTER TABLE errors DELETE WHERE pid = {pid:FixedString(12)} AND created BETWEEN {from:String} AND {to:String}',
      'ALTER TABLE error_statuses DELETE WHERE pid = {pid:FixedString(12)} AND created BETWEEN {from:String} AND {to:String}',
    ]

    const params = {
      pid,
      from,
      to,
    }

    await Promise.all(
      _map(queries, query =>
        clickhouse.command({
          query,
          query_params: params,
        }),
      ),
    )
  }

  formatToClickhouse(project: any) {
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

  filterUnsupportedColumns(
    filters: CreateProjectViewDto['filters'],
  ): CreateProjectViewDto['filters'] {
    if (!filters) {
      return []
    }

    return _filter(
      filters,
      ({ column }) =>
        _includes(ALL_COLUMNS, column as string) ||
        _includes(TRAFFIC_METAKEY_COLUMNS, column as string),
    )
  }

  formatCustomEventToClickhose(
    viewId: string,
    customEvent: ProjectViewCustomEventEntity | ProjectViewCustomEventDto,
  ) {
    if (!customEvent) {
      return null
    }

    return {
      viewId,
      // @ts-expect-error
      id: customEvent.id,
      customEventName: customEvent.customEventName,
      metaKey: customEvent.metaKey || null,
      metaValue: customEvent.metaValue || null,
      metaValueType: customEvent.metaValueType,
      metricKey: customEvent.metricKey,
    }
  }

  formatCustomEventsToClickhouse(
    viewId: string,
    customEvents: (ProjectViewCustomEventEntity | ProjectViewCustomEventDto)[],
  ) {
    if (_isEmpty(customEvents)) {
      return []
    }

    return _map(customEvents, customEvent =>
      this.formatCustomEventToClickhose(viewId, customEvent),
    )
  }

  formatViewToClickhouse(
    view: (ProjectViewEntity | CreateProjectViewDto) & {
      id: string
      projectId: string
    },
  ) {
    const { id, projectId, type, customEvents, name, filters } = view

    return {
      id,
      projectId,
      type,
      customEvents: this.formatCustomEventsToClickhouse(id, customEvents),
      name,
      filters: JSON.stringify(
        this.filterUnsupportedColumns(filters as Filter[]),
        null,
        2,
      ),
    }
  }

  formatViewsFromClickhouse(views: any[]): ProjectViewEntity[] {
    if (_isEmpty(views)) {
      return []
    }

    return _map(views, this.formatViewFromClickhouse)
  }

  formatViewFromClickhouse(view: any): ProjectViewEntity {
    const updView = { ...view }
    updView.name = _trim(updView.name)
    updView.filters = JSON.parse(view.filters)
    updView.customEvents = _map(view.customEvents, customEvent => ({
      ...customEvent,
      createdAt: '1970-01-01T00:00:00.000Z',
      updatedAt: '1970-01-01T00:00:00.000Z',
    }))

    return updView
  }

  formatFunnelToClickhouse(funnel: Funnel): ClickhouseFunnel {
    const updFunnel = { ...funnel } as unknown as ClickhouseFunnel
    updFunnel.name = _trim(funnel.name)
    updFunnel.steps = _isString(updFunnel.steps)
      ? updFunnel.steps
      : _join(updFunnel.steps, ',')

    return updFunnel
  }

  formatFunnelsFromClickhouse(funnels: ClickhouseFunnel[]): Funnel[] {
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
