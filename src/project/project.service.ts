import {
  ForbiddenException,
  Injectable,
  BadRequestException,
  UnprocessableEntityException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
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
import * as _includes from 'lodash/includes'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
// @ts-ignore
import * as validateIP from 'validate-ip-node'

import { UserService } from 'src/user/user.service'
import { ActionTokensService } from 'src/action-tokens/action-tokens.service'
import { ActionTokenType } from 'src/action-tokens/action-token.entity'
import { MailerService } from 'src/mailer/mailer.service'
import { LetterTemplate } from 'src/mailer/letter'
import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Project } from './entity/project.entity'
import { ProjectShare, Role } from './entity/project-share.entity'
import { ProjectDTO } from './dto/project.dto'
import { UserType } from '../user/entities/user.entity'
import {
  isValidPID,
  redisProjectCountCacheTimeout,
  getRedisUserCountKey,
  redis,
  clickhouse,
  isSelfhosted,
  IP_REGEX,
  ORIGINS_REGEX,
  getRedisProjectKey,
  redisProjectCacheTimeout,
  isDevelopment,
  PRODUCTION_ORIGIN,
} from '../common/constants'
import { getProjectsClickhouse } from '../common/utils'
import { ProjectSubscriber } from './entity'
import { AddSubscriberType } from './types'
import { GetSubscribersQueriesDto, UpdateSubscriberBodyDto } from './dto'
import { ReportFrequency } from './enums'

dayjs.extend(utc)

// const updateProjectRedis = async (id: string, project: Project) => {
//   const key = getRedisProjectKey(id)

//   try {
//     await redis.set(
//       key,
//       JSON.stringify(project),
//       'EX',
//       redisProjectCacheTimeout,
//     )
//   } catch {
//     await redis.del(key)
//   }
// }

export const deleteProjectRedis = async (id: string) => {
  const key = getRedisProjectKey(id)

  try {
    await redis.del(key)
  } catch (e) {
    console.error(`Error deleting project ${id} from redis: ${e}`)
  }
}

export const deleteProjectsRedis = async (ids: string[]) => {
  await Promise.all(_map(ids, deleteProjectRedis))
}

export const processProjectUser = (project: Project): Project => {
  const { share } = project

  for (let j = 0; j < _size(share); ++j) {
    const { user } = share[j]

    if (user) {
      share[j].user = _pick(user, ['email'])
    }
  }

  return project
}

export const processProjectsUser = (projects: Project[]): Project[] => {
  for (let i = 0; i < _size(projects); ++i) {
    projects[i] = processProjectUser(projects[i])
  }

  return projects
}

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(ProjectShare)
    private projectShareRepository: Repository<ProjectShare>,
    private userService: UserService,
    @InjectRepository(ProjectSubscriber)
    private readonly projectSubscriberRepository: Repository<ProjectSubscriber>,
    private readonly actionTokens: ActionTokensService,
    private readonly mailerService: MailerService,
  ) {}

  async getRedisProject(pid: string): Promise<Project | null> {
    const pidKey = getRedisProjectKey(pid)
    let project: string | Project = await redis.get(pidKey)

    if (_isEmpty(project)) {
      if (isSelfhosted) {
        project = this.formatFromClickhouse(await getProjectsClickhouse(pid))
      } else {
        // todo: optimise the relations - select
        // select only required columns
        // https://stackoverflow.com/questions/59645009/how-to-return-only-some-columns-of-a-relations-with-typeorm
        project = await this.findOne(pid, {
          relations: ['admin'],
          select: [
            'origins',
            'active',
            'admin',
            'public',
            'ipBlacklist',
            'captchaSecretKey',
            'isCaptchaEnabled',
          ],
        })
      }
      if (_isEmpty(project))
        throw new BadRequestException(
          'The provided Project ID (pid) is incorrect',
        )

      if (!isSelfhosted) {
        const share = await this.findShare({
          where: {
            project: pid,
          },
          relations: ['user'],
        })
        // @ts-ignore
        project = { ...project, share }
      }

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

  async paginate(
    options: PaginationOptionsInterface,
    where: Record<string, unknown> | undefined,
  ): Promise<Pagination<Project>> {
    const [results, total] = await this.projectsRepository.findAndCount({
      take: options.take || 100,
      skip: options.skip || 0,
      where,
      order: {
        name: 'ASC',
      },
      relations: ['share', 'share.user'],
    })

    return new Pagination<Project>({
      results: processProjectsUser(results),
      total,
    })
  }

  async paginateShared(
    options: PaginationOptionsInterface,
    where: Record<string, unknown> | undefined,
  ): Promise<Pagination<ProjectShare>> {
    const [results, total] = await this.projectShareRepository.findAndCount({
      take: options.take || 100,
      skip: options.skip || 0,
      where,
      order: {
        project: 'ASC',
      },
      relations: ['project'],
    })

    return new Pagination<ProjectShare>({
      // results: processProjectsUser(results),
      results,
      total,
    })
  }

  async count(): Promise<number> {
    return this.projectsRepository.count()
  }

  async create(project: ProjectDTO | Project): Promise<Project> {
    return this.projectsRepository.save(project)
  }

  async update(id: string, projectDTO: ProjectDTO | Project): Promise<any> {
    return this.projectsRepository.update(id, projectDTO)
  }

  async delete(id: string): Promise<any> {
    return this.projectsRepository.delete(id)
  }

  async deleteMultiple(pids: string[]): Promise<any> {
    return (
      this.projectsRepository
        .createQueryBuilder()
        .delete()
        // TODO: !!! Enforce Prepared Statements and Parameterization
        .where(`id IN (${pids})`)
        .execute()
    )
  }

  async deleteMultipleShare(where: string): Promise<any> {
    return this.projectShareRepository
      .createQueryBuilder()
      .delete()
      .where(where)
      .execute()
  }

  async createShare(share: ProjectShare): Promise<ProjectShare> {
    return this.projectShareRepository.save(share)
  }

  async deleteShare(id: string): Promise<any> {
    return this.projectShareRepository.delete(id)
  }

  async updateShare(id: string, share: ProjectShare | object): Promise<any> {
    return this.projectShareRepository.update(id, share)
  }

  async findShare(params: object): Promise<ProjectShare[]> {
    return this.projectShareRepository.find(params)
  }

  async findOneShare(
    id: string,
    params: object = {},
  ): Promise<ProjectShare | null> {
    return this.projectShareRepository.findOne(id, params)
  }

  findOneWithRelations(id: string): Promise<Project | null> {
    return this.projectsRepository.findOne(id, { relations: ['admin'] })
  }

  findOne(id: string, params: object = {}): Promise<Project | null> {
    return this.projectsRepository.findOne(id, params)
  }

  findWhere(
    where: Record<string, unknown>,
    relations?: string[],
  ): Promise<Project[]> {
    return this.projectsRepository.find({ where, relations })
  }

  find(params: object): Promise<Project[]> {
    return this.projectsRepository.find(params)
  }

  findOneWhere(
    where: Record<string, unknown>,
    params: object = {},
  ): Promise<Project> {
    return this.projectsRepository.findOne({ where, ...params })
  }

  allowedToView(project: Project, uid: string | null): void {
    if (
      project.public ||
      uid === project.admin?.id ||
      _findIndex(project.share, ({ user }) => user?.id === uid) !== -1
    ) {
      return null
    }

    throw new ForbiddenException('You are not allowed to view this project')
  }

  allowedToManage(
    project: Project,
    uid: string,
    roles: Array<UserType> = [],
    message = 'You are not allowed to manage this project',
  ): void {
    if (
      uid === project.admin?.id ||
      _includes(roles, UserType.ADMIN) ||
      _findIndex(
        project.share,
        share => share.user?.id === uid && share.role === Role.admin,
      ) !== -1
    ) {
      return null
    }

    throw new ForbiddenException(message)
  }

  async checkIfIDUnique(projectID: string): Promise<void> {
    const project = await this.findOne(projectID)

    if (project) {
      throw new BadRequestException('Selected project ID is already in use')
    }
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

  // Returns amount of exirsting events starting from month
  async getRedisCount(uid: string): Promise<number | null> {
    const countKey = getRedisUserCountKey(uid)
    let count: string | number = await redis.get(countKey)

    if (_isEmpty(count)) {
      const monthStart = dayjs
        .utc()
        .startOf('month')
        .format('YYYY-MM-DD HH:mm:ss')
      const monthEnd = dayjs.utc().endOf('month').format('YYYY-MM-DD HH:mm:ss')

      if (isSelfhosted) {
        // selfhosted has no limits
        return 0
      }
      const pids = await this.find({
        where: {
          admin: uid,
        },
        select: ['id'],
      })

      if (_isEmpty(pids)) {
        return 0
      }

      const countEVQuery = `SELECT COUNT() FROM analytics WHERE pid IN (${_join(
        _map(pids, el => `'${el.id}'`),
        ',',
      )}) AND created BETWEEN '${monthStart}' AND '${monthEnd}'`
      const countCustomEVQuery = `SELECT COUNT() FROM customEV WHERE pid IN (${_join(
        _map(pids, el => `'${el.id}'`),
        ',',
      )}) AND created BETWEEN '${monthStart}' AND '${monthEnd}'`

      const pageviews = (await clickhouse.query(countEVQuery).toPromise())[0][
        'count()'
      ]
      const customEvents = (
        await clickhouse.query(countCustomEVQuery).toPromise()
      )[0]['count()']

      count = pageviews + customEvents

      await redis.set(
        countKey,
        `${pageviews}`,
        'EX',
        redisProjectCountCacheTimeout,
      )
    } else {
      try {
        // @ts-ignore
        count = Number(count)
      } catch (e) {
        count = 0
        console.error(e)
        throw new InternalServerErrorException('Error while processing project')
      }
    }

    // @ts-ignore
    return count
  }

  async clearProjectsRedisCache(uid: string): Promise<void> {
    const projects = await this.findWhere({
      admin: uid,
    })

    if (_isEmpty(projects)) {
      return
    }

    const pids = _map(projects, 'id')

    await deleteProjectsRedis(pids)
  }

  async clearProjectsRedisCacheByEmail(email: string): Promise<void> {
    const user = await this.userService.findOneWhere({ email })

    if (!user) {
      return
    }

    await this.clearProjectsRedisCache(user.id)
  }

  async getProject(projectId: string, userId: string) {
    return this.projectsRepository.findOne({
      where: {
        id: projectId,
        admin: { id: userId },
      },
    })
  }

  async getSubscriberByEmail(projectId: string, email: string) {
    return this.projectSubscriberRepository.findOne({
      where: { projectId, email },
    })
  }

  async addSubscriber(data: AddSubscriberType) {
    const subscriber = await this.projectSubscriberRepository.save({ ...data })
    await this.sendSubscriberInvite(data, subscriber.id)
    return subscriber
  }

  async sendSubscriberInvite(data: AddSubscriberType, subscriberId: string) {
    const { userId, projectId, projectName, email, origin } = data
    const actionToken = await this.actionTokens.createActionToken(
      userId,
      ActionTokenType.ADDING_PROJECT_SUBSCRIBER,
      `${projectId}:${subscriberId}`,
    )
    const url = `${origin}/projects/${projectId}/subscribers/invite?token=${actionToken.id}`
    await this.mailerService.sendEmail(
      email,
      LetterTemplate.ProjectSubscriberInvitation,
      {
        url,
        projectName,
      },
    )
  }

  async getProjectById(projectId: string) {
    return this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['admin'],
    })
  }

  async getSubscriber(projectId: string, subscriberId: string) {
    return this.projectSubscriberRepository.findOne({
      where: { id: subscriberId, projectId },
    })
  }

  async confirmSubscriber(
    projectId: string,
    subscriberId: string,
    token: string,
  ) {
    await this.projectSubscriberRepository.update(
      { id: subscriberId, projectId },
      { isConfirmed: true },
    )
    await this.actionTokens.deleteActionToken(token)
  }

  async getSubscribers(projectId: string, queries: GetSubscribersQueriesDto) {
    const [subscribers, count] =
      await this.projectSubscriberRepository.findAndCount({
        skip: Number(queries.offset) || 0,
        take: Number(queries.limit) > 100 ? 100 : Number(queries.limit) || 100,
        where: { projectId },
      })
    return { subscribers, count }
  }

  async updateSubscriber(
    projectId: string,
    subscriberId: string,
    data: UpdateSubscriberBodyDto,
  ) {
    await this.projectSubscriberRepository.update(
      { id: subscriberId, projectId },
      data,
    )
    return this.getSubscriber(projectId, subscriberId)
  }

  async removeSubscriber(projectId: string, subscriberId: string) {
    await this.projectSubscriberRepository.delete({
      id: subscriberId,
      projectId,
    })
  }

  async getSubscribersForReports(reportFrequency: ReportFrequency) {
    return this.projectSubscriberRepository.find({
      relations: ['project'],
      where: { reportFrequency, isConfirmed: true },
    })
  }

  async getSubscriberProjects(subscriberId: string) {
    const projects = await this.projectSubscriberRepository.find({
      relations: ['project'],
      where: { id: subscriberId },
    })
    return projects.map(project => project.project)
  }

  async getOwnProject(projectId: string, userId: string) {
    return this.projectsRepository.findOne({
      where: { id: projectId, admin: { id: userId } },
    })
  }

  async transferProject(
    projectId: string,
    name: string,
    userId: string,
    email: string,
    origin: string,
  ) {
    const actionToken = await this.actionTokens.createActionToken(
      userId,
      ActionTokenType.TRANSFER_PROJECT,
      projectId,
    )

    await this.projectsRepository.update(
      { id: projectId },
      {
        isTransferring: true,
      },
    )

    const confirmUrl = `${
      isDevelopment ? origin : PRODUCTION_ORIGIN
    }/project/transfer/confirm?token=${actionToken.id}`
    const cancelUrl = `${
      isDevelopment ? origin : PRODUCTION_ORIGIN
    }/project/transfer/cancel?token=${actionToken.id}`

    await this.mailerService.sendEmail(email, LetterTemplate.ProjectTransfer, {
      confirmUrl,
      cancelUrl,
      name,
    })
  }

  async confirmTransferProject(
    projectId: string,
    userId: string,
    oldAdminId: string,
    token: string,
  ) {
    await this.projectsRepository.update(
      { id: projectId },
      { admin: { id: userId }, isTransferring: false },
    )
    await this.projectShareRepository.save({
      user: { id: oldAdminId },
      project: { id: projectId },
      confirmed: true,
      role: Role.admin,
    })
    await this.actionTokens.deleteActionToken(token)
  }

  async cancelTransferProject(token: string, projectId: string) {
    await this.projectsRepository.update(
      { id: projectId },
      { isTransferring: false },
    )
    await this.actionTokens.deleteActionToken(token)
  }

  async getProjectsByUserId(userId: string) {
    return this.projectsRepository.find({
      where: { admin: { id: userId } },
    })
  }

  async getProjectByNameAndUserId(name: string, userId: string) {
    return this.projectsRepository.findOne({
      where: { name, admin: { id: userId } },
    })
  }
}
