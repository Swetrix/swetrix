import net from 'net'
import {
  ForbiddenException,
  Injectable,
  BadRequestException,
  UnprocessableEntityException,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  FindManyOptions,
  FindOneOptions,
  Repository,
  DeepPartial,
  Brackets,
  FindOptionsWhere,
  In,
} from 'typeorm'
import CryptoJS from 'crypto-js'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _join from 'lodash/join'
import _map from 'lodash/map'
import _pick from 'lodash/pick'
import _trim from 'lodash/trim'
import _findIndex from 'lodash/findIndex'
import _filter from 'lodash/filter'
import _includes from 'lodash/includes'
import _reduce from 'lodash/reduce'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { compareSync } from 'bcrypt'

import { UserService } from '../user/user.service'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { ActionTokenType } from '../action-tokens/action-token.entity'
import { MailerService } from '../mailer/mailer.service'
import { LetterTemplate } from '../mailer/letter'
import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Project } from './entity/project.entity'
import { ProjectShare, Role } from './entity/project-share.entity'
import { ProjectDTO } from './dto/project.dto'
import { MAX_PROJECT_PASSWORD_LENGTH } from './dto/project-password.dto'
import {
  isValidPID,
  redisProjectCountCacheTimeout,
  getRedisUserCountKey,
  redis,
  IP_REGEX,
  ORIGINS_REGEX,
  getRedisProjectKey,
  redisProjectCacheTimeout,
  isDevelopment,
  PRODUCTION_ORIGIN,
  getRedisUserUsageInfoKey,
  redisUserUsageinfoCacheTimeout,
  TRAFFIC_COLUMNS,
  EMAIL_ACTION_ENCRYPTION_KEY,
  ALL_COLUMNS,
  TRAFFIC_METAKEY_COLUMNS,
} from '../common/constants'
import { clickhouse } from '../common/integrations/clickhouse'
import { IUsageInfoRedis } from '../user/interfaces'
import { ProjectSubscriber, Funnel, Annotation, PinnedProject } from './entity'
import { AddSubscriberType } from './types'
import {
  CreateProjectDTO,
  GetSubscribersQueriesDto,
  UpdateProjectDto,
  UpdateSubscriberBodyDto,
  FunnelCreateDTO,
  FunnelUpdateDTO,
  AnnotationCreateDTO,
  AnnotationUpdateDTO,
} from './dto'
import { ReportFrequency } from './enums'
import { CreateProjectViewDto } from './dto/create-project-view.dto'
import { Organisation } from '../organisation/entity/organisation.entity'
import { OrganisationRole } from '../organisation/entity/organisation-member.entity'

dayjs.extend(utc)

// A list of characters that can be used in a Project ID
export const LEGAL_PID_CHARACTERS =
  '1234567890QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm'
export const PID_LENGTH = 12

const DEFAULT_USAGE_INFO = {
  total: 0,
  traffic: 0,
  customEvents: 0,
  captcha: 0,
  errors: 0,
}

export const deleteProjectRedis = async (id: string) => {
  const key = getRedisProjectKey(id)

  try {
    await redis.del(key)
  } catch (reason) {
    console.error(`Error deleting project ${id} from redis: ${reason}`)
  }
}

const deleteProjectsRedis = async (ids: string[]) => {
  await Promise.all(_map(ids, deleteProjectRedis))
}

export const processProjectUser = (
  project: Project,
  properties: Array<'share' | 'organisation.members'> = ['share'],
): Project => {
  _map(properties, (property) => {
    const array =
      property === 'share' ? project.share : project.organisation?.members

    if (array) {
      for (let j = 0; j < _size(array); ++j) {
        const { user } = array[j]

        if (user) {
          // @ts-expect-error _pick(user, ['email']) is partial but array[j].user expects full User entity
          array[j].user = _pick(user, ['email', 'id'])
        }
      }
    }
  })

  return project
}

const processProjectsUser = (
  projects: Project[],
  properties: Array<'share' | 'organisation.members'> = ['share'],
): Project[] => {
  for (let i = 0; i < _size(projects); ++i) {
    projects[i] = processProjectUser(projects[i], properties)
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
    @InjectRepository(ProjectSubscriber)
    private readonly projectSubscriberRepository: Repository<ProjectSubscriber>,
    @InjectRepository(Funnel)
    private readonly funnelRepository: Repository<Funnel>,
    @InjectRepository(Annotation)
    private readonly annotationRepository: Repository<Annotation>,
    @InjectRepository(PinnedProject)
    private readonly pinnedProjectRepository: Repository<PinnedProject>,
    private readonly actionTokens: ActionTokensService,
    private readonly mailerService: MailerService,
    private readonly userService: UserService,
  ) {}

  async getRedisProject(pid: string): Promise<Project | null> {
    const pidKey = getRedisProjectKey(pid)
    let project: string | Project = await redis.get(pidKey)

    if (_isEmpty(project)) {
      project = await this.projectsRepository
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.admin', 'admin')
        .leftJoinAndSelect('project.organisation', 'organisation')
        .leftJoinAndSelect(
          'organisation.members',
          'organisationMembers',
          'organisationMembers.confirmed = :confirmed',
          { confirmed: true },
        )
        .leftJoinAndSelect('organisationMembers.user', 'organisationUser')
        .select([
          'project.origins',
          'project.active',
          'project.public',
          'project.ipBlacklist',
          'project.countryBlacklist',
          'project.botsProtectionLevel',
          'project.captchaSecretKey',
          'project.captchaDifficulty',
          'project.passwordHash',
          'project.isPasswordProtected',
          'admin.id',
          'admin.dashboardBlockReason',
          'admin.isAccountBillingSuspended',
          'organisation.id',
          'organisationMembers.role',
          'organisationMembers.confirmed',
          'organisationUser.id',
        ])
        .where('project.id = :pid', { pid })
        .getOne()

      if (_isEmpty(project)) {
        throw new BadRequestException(
          'The provided Project ID (pid) is incorrect',
        )
      }

      const share = await this.projectShareRepository
        .createQueryBuilder('share')
        .leftJoinAndSelect('share.user', 'user')
        .select(['share.role', 'share.confirmed', 'user.id'])
        .where('share.project = :pid', { pid })
        .getMany()

      project = { ...project, share }

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

    return project as Project
  }

  // Instead of passing relations to the findOne method every time, this method returns a project
  // with necessary relations needed for the allowedToView and allowedToManage methods.
  // Authorisation should be handled separately via allowedToView/allowedToManage.
  async getFullProject(pid: string, additionalRelations: string[] = []) {
    return this.projectsRepository.findOne({
      where: { id: pid },
      relations: [
        'share',
        'share.user',
        'admin',
        'organisation',
        'organisation.members',
        'organisation.members.user',
        ...additionalRelations,
      ],
      select: {
        share: {
          id: true,
          role: true,
          confirmed: true,
          user: {
            id: true,
            email: true,
          },
        },
        admin: {
          id: true,
          dashboardBlockReason: true,
          isAccountBillingSuspended: true,
        },
        organisation: {
          id: true,
          members: {
            id: true,
            role: true,
            confirmed: true,
            user: {
              id: true,
            },
          },
        },
      },
    })
  }

  async paginate(
    options: PaginationOptionsInterface,
    userId: string,
    search?: string,
    sort?: string,
  ): Promise<Pagination<Project>> {
    const queryBuilder = this.projectsRepository
      .createQueryBuilder('project')
      .select([
        'project',
        'admin.id',
        'admin.dashboardBlockReason',
        'share.id',
        'share.role',
        'share.confirmed',
        'sharedUser.id',
        'sharedUser.email',
        'organisation.id',
        'organisation.name',
        'organisationMembers.id',
        'organisationMembers.role',
        'organisationMembers.confirmed',
        'organisationUser.id',
        'organisationUser.email',
      ])
      .addSelect(
        'CASE WHEN pinnedProject.id IS NOT NULL THEN 1 ELSE 0 END',
        'isPinned',
      )
      .leftJoin('project.admin', 'admin')
      .leftJoin('project.share', 'share')
      .leftJoin('share.user', 'sharedUser')
      .leftJoin('project.organisation', 'organisation')
      .leftJoin('organisation.members', 'organisationMembers')
      .leftJoin('organisationMembers.user', 'organisationUser')
      .leftJoin(
        PinnedProject,
        'pinnedProject',
        'pinnedProject.projectId = project.id AND pinnedProject.userId = :userId',
      )
      .where(
        new Brackets((qb) => {
          qb.where('project.adminId = :userId')
            .orWhere(
              'EXISTS (SELECT 1 FROM project_share ps WHERE ps.projectId = project.id AND ps.userId = :userId)',
            )
            .orWhere(
              'EXISTS (SELECT 1 FROM organisation_member om WHERE om.organisationId = project.organisationId AND om.userId = :userId AND om.confirmed = true)',
            )
        }),
        { userId },
      )

    if (search?.trim()) {
      queryBuilder
        .andWhere('project.name LIKE :search')
        .setParameter('search', search ? `%${search.trim()}%` : '')
    }

    // Always sort pinned projects first, then apply the requested sort
    queryBuilder.orderBy('isPinned', 'DESC')

    // Add secondary sorting based on options.sort
    switch (sort) {
      case 'alpha_asc':
        queryBuilder.addOrderBy('project.name', 'ASC')
        break
      case 'alpha_desc':
        queryBuilder.addOrderBy('project.name', 'DESC')
        break
      case 'date_asc':
        queryBuilder.addOrderBy('project.created', 'ASC')
        break
      case 'date_desc':
        queryBuilder.addOrderBy('project.created', 'DESC')
        break
      default:
        queryBuilder.addOrderBy('project.name', 'ASC')
    }

    queryBuilder.skip(options.skip || 0).take(options.take || 100)

    const [results, total] = await queryBuilder.getManyAndCount()
    const processedResults = await processProjectsUser(results, [
      'share',
      'organisation.members',
    ])

    return new Pagination<Project>({
      results: processedResults,
      total,
    })
  }

  async paginateForOrganisation(
    options: PaginationOptionsInterface,
    userId: string,
    search?: string,
  ): Promise<Pagination<Project>> {
    const queryBuilder = this.projectsRepository
      .createQueryBuilder('project')
      .select(['project.id', 'project.name'])
      .leftJoin('project.admin', 'admin')
      .leftJoin('project.share', 'share')
      .where('project.organisation IS NULL')
      .andWhere(
        new Brackets((qb) => {
          qb.where('admin.id = :userId', { userId }).orWhere(
            'share.user.id = :userId AND share.role = :adminRole',
            { userId, adminRole: Role.admin },
          )
        }),
      )

    if (search?.trim()) {
      queryBuilder.andWhere('LOWER(project.name) LIKE LOWER(:search)', {
        search: `%${search.trim()}%`,
      })
    }

    queryBuilder
      .orderBy('project.name', 'ASC')
      .skip(options.skip || 0)
      .take(options.take || 100)

    const [results, total] = await queryBuilder.getManyAndCount()

    return new Pagination<Project>({
      results,
      total,
    })
  }

  async count(): Promise<number> {
    return this.projectsRepository.count()
  }

  async countByAdminId(adminId: string): Promise<number> {
    return this.projectsRepository.count({ where: { admin: { id: adminId } } })
  }

  async getProjectIdsByAdminId(adminId: string): Promise<string[]> {
    const projects = await this.projectsRepository.find({
      where: { admin: { id: adminId } },
      select: ['id'],
    })
    return _map(projects, 'id')
  }

  async create(project: DeepPartial<Project>) {
    return this.projectsRepository.save(project)
  }

  async update(
    where: FindOptionsWhere<Project>,
    projectDTO: DeepPartial<Project>,
  ) {
    return this.projectsRepository.update(where, projectDTO)
  }

  async delete(id: string) {
    return this.projectsRepository.delete(id)
  }

  async deleteMultiple(pids: string[]) {
    return this.projectsRepository
      .createQueryBuilder()
      .delete()
      .whereInIds(pids)
      .execute()
  }

  async deleteProjectsForUser(userId: string) {
    const projects = await this.projectsRepository.find({
      where: { admin: { id: userId } },
      select: ['id'],
    })

    if (_isEmpty(projects)) {
      return
    }

    const projectIds = _map(projects, 'id')
    const queries = [
      'ALTER TABLE analytics DELETE WHERE pid IN ({pids:Array(FixedString(12))})',
      'ALTER TABLE customEV DELETE WHERE pid IN ({pids:Array(FixedString(12))})',
      'ALTER TABLE performance DELETE WHERE pid IN ({pids:Array(FixedString(12))})',
      'ALTER TABLE errors DELETE WHERE pid IN ({pids:Array(FixedString(12))})',
      'ALTER TABLE error_statuses DELETE WHERE pid IN ({pids:Array(FixedString(12))})',
      'ALTER TABLE captcha DELETE WHERE pid IN ({pids:Array(FixedString(12))})',
    ]

    await Promise.all(
      _map(queries, (query) =>
        clickhouse.command({
          query,
          query_params: {
            pids: projectIds,
          },
        }),
      ),
    )

    await this.funnelRepository.delete({ project: { id: In(projectIds) } })
    await this.annotationRepository.delete({ project: { id: In(projectIds) } })
    await this.deleteMultipleShare({ project: { id: In(projectIds) } })
    await this.deleteMultiple(projectIds)
    await deleteProjectsRedis(projectIds)
  }

  async deleteMultipleShare(where: FindOptionsWhere<ProjectShare>) {
    return this.projectShareRepository.delete(where)
  }

  async createShare(share: ProjectShare): Promise<ProjectShare> {
    return this.projectShareRepository.save(share)
  }

  async deleteShare(id: string) {
    return this.projectShareRepository.delete(id)
  }

  async updateShare(id: string, share: ProjectShare | object) {
    return this.projectShareRepository.update(id, share)
  }

  async findShare(
    options: FindManyOptions<ProjectShare>,
  ): Promise<ProjectShare[]> {
    return this.projectShareRepository.find(options)
  }

  async findOneShare(
    options: FindOneOptions<ProjectShare>,
  ): Promise<ProjectShare | null> {
    return this.projectShareRepository.findOne(options)
  }

  findOneWithRelations(id: string, relations = ['admin']) {
    return this.projectsRepository.findOne({ where: { id }, relations })
  }

  findOne(options: FindOneOptions<Project>) {
    return this.projectsRepository.findOne(options)
  }

  find(options: FindManyOptions<Project>) {
    return this.projectsRepository.find(options)
  }

  allowedToView(
    project: Project,
    uid: string | null,
    password?: string | null,
  ): void {
    if (
      project.public ||
      uid === project.admin?.id ||
      _findIndex(
        project.share,
        ({ user, confirmed }) => user?.id === uid && confirmed === true,
      ) !== -1 ||
      _findIndex(
        project.organisation?.members,
        (member) => member.user?.id === uid && member.confirmed === true,
      ) !== -1
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

  allowedToManage(
    project: Project,
    uid: string,
    message = 'You are not allowed to manage this project',
  ): void {
    if (
      uid === project.admin?.id ||
      _findIndex(
        project.share,
        (share) =>
          share.user?.id === uid &&
          share.role === Role.admin &&
          share.confirmed === true,
      ) !== -1 ||
      _findIndex(
        project.organisation?.members,
        (member) =>
          member.user?.id === uid &&
          member.confirmed === true &&
          (member.role === OrganisationRole.admin ||
            member.role === OrganisationRole.owner),
      ) !== -1
    ) {
      return null
    }

    throw new ForbiddenException(message)
  }

  async isPIDUnique(pid: string): Promise<boolean> {
    const exists = await this.projectsRepository.findOne({
      where: { id: pid },
      select: ['id'],
    })

    return !exists
  }

  async checkIfIDUnique(pid: string): Promise<void> {
    const isUnique = this.isPIDUnique(pid)

    if (!isUnique) {
      throw new BadRequestException('Selected project ID is already in use')
    }
  }

  async deleteByFilters(
    pid: string,
    type: string,
    filters: string,
  ): Promise<void> {
    if (!type || _isEmpty(filters)) {
      return
    }

    if (!_includes(TRAFFIC_COLUMNS, type)) {
      throw new UnprocessableEntityException(
        `The provided type (${type}) is incorrect`,
      )
    }

    let query = `ALTER TABLE analytics DELETE WHERE pid={pid:FixedString(12)} AND (`

    const params = {
      pid,
    }

    for (let i = 0; i < _size(filters); ++i) {
      if (i > 0) {
        query += ' OR '
      }

      const key = `filter_${i}`
      query += `${type}={${key}:String}`
      params[key] = filters[i]
    }

    query += ')'

    await clickhouse.command({
      query,
      query_params: params,
    })
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
      _map(queries, (query) =>
        clickhouse.command({
          query,
          query_params: params,
        }),
      ),
    )
  }

  validateOrigins(
    projectDTO: ProjectDTO | UpdateProjectDto | CreateProjectDTO,
  ) {
    if (_size(_join(projectDTO.origins, ',')) > 300)
      throw new UnprocessableEntityException(
        'The list of allowed origins has to be smaller than 300 symbols',
      )

    _map(projectDTO.origins, (host) => {
      if (!ORIGINS_REGEX.test(_trim(host))) {
        throw new ConflictException(`Host ${host} is not correct`)
      }
    })
  }

  validateIPBlacklist(
    projectDTO: ProjectDTO | UpdateProjectDto | CreateProjectDTO,
  ) {
    if (_size(_join(projectDTO.ipBlacklist, ',')) > 300)
      throw new UnprocessableEntityException(
        'The list of allowed blacklisted IP addresses must be less than 300 characters.',
      )
    _map(projectDTO.ipBlacklist, (ip) => {
      if (!net.isIP(_trim(ip)) && !IP_REGEX.test(_trim(ip))) {
        throw new ConflictException(`IP address ${ip} is not correct`)
      }
    })
  }

  validateCountryBlacklist(
    projectDTO: ProjectDTO | UpdateProjectDto | CreateProjectDTO,
  ) {
    if (!projectDTO.countryBlacklist) {
      return
    }

    if (_size(projectDTO.countryBlacklist) > 250)
      throw new UnprocessableEntityException(
        'The list of blocked countries cannot exceed 250 entries.',
      )

    const countryCodeRegex = /^[A-Z]{2}$/
    _map(projectDTO.countryBlacklist, (code) => {
      const trimmedCode = _trim(code).toUpperCase()
      if (!countryCodeRegex.test(trimmedCode)) {
        throw new ConflictException(
          `Country code "${code}" is not a valid ISO 3166-1 alpha-2 code`,
        )
      }
    })
  }

  validateProject(
    projectDTO: ProjectDTO | UpdateProjectDto | CreateProjectDTO,
    creatingProject = false,
  ) {
    if (_size(projectDTO.name) > 50)
      throw new UnprocessableEntityException('The project name is too long')

    if (creatingProject) {
      return
    }

    // @ts-ignore
    if (projectDTO?.id && !isValidPID(projectDTO.id))
      throw new UnprocessableEntityException(
        'The provided Project ID (pid) is incorrect',
      )

    this.validateOrigins(projectDTO)
    this.validateIPBlacklist(projectDTO)
    this.validateCountryBlacklist(projectDTO)
  }

  // Returns amount of existing events starting from month
  async getRedisCount(uid: string): Promise<number | null> {
    const countKey = getRedisUserCountKey(uid)
    let count: string | number = await redis.get(countKey)

    if (_isEmpty(count)) {
      const monthStart = dayjs
        .utc()
        .startOf('month')
        .format('YYYY-MM-DD HH:mm:ss')
      const monthEnd = dayjs.utc().endOf('month').format('YYYY-MM-DD HH:mm:ss')

      const projects = await this.find({
        where: {
          admin: { id: uid },
        },
        select: ['id'],
      })

      if (_isEmpty(projects)) {
        return 0
      }

      const CHUNK_SIZE = 5000
      const pids = _map(projects, 'id')
      let totalPageviews = 0
      let totalCustomEvents = 0
      let totalCaptcha = 0
      let totalErrors = 0

      // Process PIDs in chunks
      for (let i = 0; i < pids.length; i += CHUNK_SIZE) {
        const pidChunk = pids.slice(i, i + CHUNK_SIZE)
        const params = {
          pids: pidChunk,
          monthStart,
          monthEnd,
        }

        const selector = `
          WHERE created BETWEEN {monthStart:String} AND {monthEnd:String}
          AND pid IN ({pids:Array(FixedString(12))})
        `

        const countEVQuery = `SELECT count() FROM analytics ${selector}`
        const countCustomEVQuery = `SELECT count() FROM customEV ${selector}`
        const countCaptchaQuery = `SELECT count() FROM captcha ${selector}`
        const countErrorsQuery = `SELECT count() FROM errors ${selector}`

        const [
          { data: pageviews },
          { data: customEvents },
          { data: captcha },
          { data: errors },
        ] = await Promise.all([
          clickhouse
            .query({
              query: countEVQuery,
              query_params: params,
            })
            .then((resultSet) => resultSet.json()),
          clickhouse
            .query({
              query: countCustomEVQuery,
              query_params: params,
            })
            .then((resultSet) => resultSet.json()),
          clickhouse
            .query({
              query: countCaptchaQuery,
              query_params: params,
            })
            .then((resultSet) => resultSet.json()),
          clickhouse
            .query({
              query: countErrorsQuery,
              query_params: params,
            })
            .then((resultSet) => resultSet.json()),
        ])

        totalPageviews += pageviews[0]['count()']
        totalCustomEvents += customEvents[0]['count()']
        totalCaptcha += captcha[0]['count()']
        totalErrors += errors[0]['count()']
      }

      count = totalPageviews + totalCustomEvents + totalCaptcha + totalErrors

      await redis.set(countKey, `${count}`, 'EX', redisProjectCountCacheTimeout)
    } else {
      try {
        count = Number(count)
      } catch (reason) {
        count = 0
        console.error(`[ERROR][project -> getRedisCount] ${reason}`)
        throw new InternalServerErrorException('Error while processing project')
      }
    }

    return count as number
  }

  async getRedisUsageInfo(uid: string): Promise<IUsageInfoRedis | null> {
    const key = getRedisUserUsageInfoKey(uid)
    let info: string | IUsageInfoRedis = await redis.get(key)

    if (_isEmpty(info)) {
      const monthStart = dayjs
        .utc()
        .startOf('month')
        .format('YYYY-MM-DD HH:mm:ss')
      const monthEnd = dayjs.utc().endOf('month').format('YYYY-MM-DD HH:mm:ss')

      const projects = await this.find({
        where: {
          admin: { id: uid },
        },
        select: ['id'],
      })

      if (_isEmpty(projects)) {
        return DEFAULT_USAGE_INFO
      }

      const CHUNK_SIZE = 5000
      const pids = _map(projects, 'id')
      let totalTraffic = 0
      let totalCustomEvents = 0
      let totalCaptcha = 0
      let totalErrors = 0

      // Process PIDs in chunks
      for (let i = 0; i < pids.length; i += CHUNK_SIZE) {
        const pidChunk = pids.slice(i, i + CHUNK_SIZE)
        const params = { pids: pidChunk }

        const selector = `
        WHERE pid IN ({pids:Array(FixedString(12))})
        AND created BETWEEN '${monthStart}' AND '${monthEnd}'
      `

        const countEVQuery = `SELECT count() FROM analytics ${selector}`
        const countCustomEVQuery = `SELECT count() FROM customEV ${selector}`
        const countCaptchaQuery = `SELECT count() FROM captcha ${selector}`
        const countErrorsQuery = `SELECT count() FROM errors ${selector}`

        const [
          { data: rawTraffic },
          { data: rawCustomEvents },
          { data: rawCaptcha },
          { data: rawErrors },
        ] = await Promise.all([
          clickhouse
            .query({
              query: countEVQuery,
              query_params: params,
            })
            .then((resultSet) => resultSet.json()),
          clickhouse
            .query({
              query: countCustomEVQuery,
              query_params: params,
            })
            .then((resultSet) => resultSet.json()),
          clickhouse
            .query({
              query: countCaptchaQuery,
              query_params: params,
            })
            .then((resultSet) => resultSet.json()),
          clickhouse
            .query({
              query: countErrorsQuery,
              query_params: params,
            })
            .then((resultSet) => resultSet.json()),
        ])

        totalTraffic += rawTraffic[0]['count()']
        totalCustomEvents += rawCustomEvents[0]['count()']
        totalCaptcha += rawCaptcha[0]['count()']
        totalErrors += rawErrors[0]['count()']
      }

      const total =
        totalTraffic + totalCustomEvents + totalCaptcha + totalErrors

      info = {
        total,
        traffic: totalTraffic,
        customEvents: totalCustomEvents,
        captcha: totalCaptcha,
        errors: totalErrors,
      }

      await redis.set(
        key,
        JSON.stringify(info),
        'EX',
        redisUserUsageinfoCacheTimeout,
      )
    } else {
      try {
        info = JSON.parse(info)
      } catch (reason) {
        console.error(`[ERROR][project -> getRedisUsageInfo] ${reason}`)
        info = DEFAULT_USAGE_INFO
      }
    }

    return info as IUsageInfoRedis
  }

  async clearProjectsRedisCache(uid: string): Promise<void> {
    const projects = await this.find({
      where: {
        admin: { id: uid },
      },
    })

    if (_isEmpty(projects)) {
      return
    }

    const pids = _map(projects, 'id')

    await deleteProjectsRedis(pids)
  }

  async clearProjectsRedisCacheBySubId(subID: string): Promise<void> {
    const user = await this.userService.findOne({ where: { subID } })

    if (!user) {
      return
    }

    await this.clearProjectsRedisCache(user.id)
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
      .then((resultSet) => resultSet.json<{ pid: string }>())

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
      .then((resultSet) => resultSet.json<{ pid: string }>())

    return _map(data, ({ pid }) => pid)
  }

  async getPIDsWhereCaptchaDataExists(projectIds: string[]): Promise<string[]> {
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
            FROM captcha
            WHERE pid IN (${pids})
          )
          THEN 1
          ELSE 0
        END AS exists
      FROM
      (
        SELECT DISTINCT pid
        FROM captcha
        WHERE pid IN (${pids})
      );
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: params,
      })
      .then((resultSet) => resultSet.json<{ pid: string }>())

    return _map(data, ({ pid }) => pid)
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

  async findOneSubscriber(where: FindOneOptions<ProjectSubscriber>['where']) {
    return this.projectSubscriberRepository.findOne({ where })
  }

  async getSubscriber(projectId: string, subscriberId: string) {
    return this.projectSubscriberRepository.findOne({
      where: { id: subscriberId, projectId },
    })
  }

  async getSubscriberById(id: string) {
    return this.projectSubscriberRepository.findOne({
      where: { id },
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

  async createFunnel(projectId: string, data: FunnelCreateDTO) {
    const funnel = await this.funnelRepository.save({
      ...data,
      project: { id: projectId },
    })
    return funnel
  }

  async getFunnels(projectId: string) {
    return this.funnelRepository.find({
      where: { project: { id: projectId } },
    })
  }

  async getFunnel(funnelId: string, projectId: string) {
    return this.funnelRepository.findOne({
      where: { id: funnelId, project: { id: projectId } },
    })
  }

  async updateFunnel(data: FunnelUpdateDTO) {
    return this.funnelRepository.update({ id: data.id }, data)
  }

  async deleteFunnel(id: string) {
    return this.funnelRepository.delete({ id })
  }

  async createAnnotation(projectId: string, data: AnnotationCreateDTO) {
    const annotation = await this.annotationRepository.save({
      date: data.date,
      text: data.text,
      project: { id: projectId },
    })
    return annotation
  }

  async getAnnotations(projectId: string) {
    return this.annotationRepository.find({
      where: { project: { id: projectId } },
      order: { date: 'ASC' },
    })
  }

  async getAnnotation(annotationId: string, projectId: string) {
    return this.annotationRepository.findOne({
      where: { id: annotationId, project: { id: projectId } },
    })
  }

  async updateAnnotation(data: AnnotationUpdateDTO) {
    const updateData: Partial<Annotation> = {}
    if (data.date !== undefined) {
      updateData.date = new Date(data.date)
    }
    if (data.text !== undefined) {
      updateData.text = data.text
    }
    return this.annotationRepository.update({ id: data.id }, updateData)
  }

  async deleteAnnotation(id: string) {
    return this.annotationRepository.delete({ id })
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

  async removeSubscriberById(id: string) {
    await this.projectSubscriberRepository.delete({
      id,
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
    return projects.map((p) => p.project).filter(Boolean)
  }

  async getOwnProject(projectId: string, userId: string) {
    return this.projectsRepository.findOne({
      where: { id: projectId, admin: { id: userId } },
    })
  }

  createUnsubscribeKey(subscriberId: string): string {
    const base64 = CryptoJS.Rabbit.encrypt(
      subscriberId,
      EMAIL_ACTION_ENCRYPTION_KEY,
    ).toString()
    // Convert to URL-safe base64 (base64url)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  decryptUnsubscribeKey(token: string): string {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/')

    const padding = base64.length % 4
    if (padding) {
      base64 += '='.repeat(4 - padding)
    }

    const bytes = CryptoJS.Rabbit.decrypt(base64, EMAIL_ACTION_ENCRYPTION_KEY)
    return bytes.toString(CryptoJS.enc.Utf8)
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

    await deleteProjectRedis(projectId)
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

  async updateProject(id: string, data: Partial<Project>) {
    await this.projectsRepository.update({ id }, data)
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

  async addProjectToOrganisation(organisationId: string, projectId: string) {
    const project = await this.findOne({
      where: { id: projectId },
    })

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`)
    }

    return this.update({ id: projectId }, {
      organisation: {
        id: organisationId,
      } as Organisation,
    } as Project)
  }

  async removeProjectFromOrganisation(
    organisationId: string,
    projectId: string,
  ) {
    const project = await this.findOne({
      where: { id: projectId },
      relations: ['organisation'],
    })

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`)
    }

    if (project.organisation?.id !== organisationId) {
      throw new BadRequestException(
        `Project with ID ${projectId} is not in organisation with ID ${organisationId}`,
      )
    }

    return this.update({ id: projectId }, {
      organisation: null,
    } as Project)
  }

  async processDefaultResults(paginated: Pagination<Project>, userId: string) {
    const pidsWithData = await this.getPIDsWhereAnalyticsDataExists(
      _map(paginated.results, ({ id }) => id),
    )

    const pidsWithErrorData = await this.getPIDsWhereErrorsDataExists(
      _map(paginated.results, ({ id }) => id),
    )

    const pinnedProjectIds = await this.getPinnedProjectIds(userId)

    paginated.results = _map(paginated.results, (project) => {
      const userShare = project.share?.find(
        (share) => share.user?.id === userId,
      )
      const organisationMembership = project.organisation?.members?.find(
        (member) => member.user?.id === userId,
      )

      let role
      let isAccessConfirmed = true

      if (project.admin?.id === userId) {
        role = 'owner'
      } else if (userShare) {
        role = userShare.role
        isAccessConfirmed = userShare.confirmed
      } else if (organisationMembership) {
        role = organisationMembership.role
        isAccessConfirmed = organisationMembership.confirmed
      }

      return {
        ...project,
        isAccessConfirmed,
        isLocked: !!project.admin?.dashboardBlockReason,
        isDataExists: _includes(pidsWithData, project?.id),
        isErrorDataExists: _includes(pidsWithErrorData, project?.id),
        organisationId: project?.organisation?.id,
        isPinned: _includes(pinnedProjectIds, project?.id),
        role,
        passwordHash: undefined,
        admin: undefined,
        captchaSecretKey: undefined,
      }
    })

    // Pinned projects are already sorted at the database level in paginate()

    return paginated
  }

  async getPinnedProjectIds(userId: string): Promise<string[]> {
    const pinnedProjects = await this.pinnedProjectRepository.find({
      where: { user: { id: userId } },
      relations: ['project'],
      select: {
        project: {
          id: true,
        },
      },
    })

    return _map(pinnedProjects, (pp) => pp.project?.id).filter(Boolean)
  }

  async pinProject(userId: string, projectId: string): Promise<void> {
    // Check if already pinned
    const existing = await this.pinnedProjectRepository.findOne({
      where: {
        user: { id: userId },
        project: { id: projectId },
      },
    })

    if (existing) {
      return // Already pinned
    }

    await this.pinnedProjectRepository.save({
      user: { id: userId },
      project: { id: projectId },
    })
  }

  async unpinProject(userId: string, projectId: string): Promise<void> {
    await this.pinnedProjectRepository.delete({
      user: { id: userId },
      project: { id: projectId },
    })
  }

  async isProjectPinned(userId: string, projectId: string): Promise<boolean> {
    const pinned = await this.pinnedProjectRepository.findOne({
      where: {
        user: { id: userId },
        project: { id: projectId },
      },
    })

    return !!pinned
  }
}
