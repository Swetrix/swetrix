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
} from 'typeorm'
import handlebars from 'handlebars'
import puppeteer from 'puppeteer'
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
import { ProjectSubscriber, Funnel } from './entity'
import { AddSubscriberType } from './types'
import {
  CreateProjectDTO,
  GetSubscribersQueriesDto,
  UpdateProjectDto,
  UpdateSubscriberBodyDto,
  FunnelCreateDTO,
  FunnelUpdateDTO,
} from './dto'
import { ReportFrequency } from './enums'
import { nFormatter } from '../common/utils'
import { browserArgs } from '../og-image/og-image.service'
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
  _map(properties, property => {
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

const WHITE_LOGO_BASE64 =
  'data:image/png;base64,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'

const previewHTML = `
<!DOCTYPE html>
<html lang='en'>
  <head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
    <style>{{styles}}</style>
  </head>
  <body id='body'>
    <main>
      <div class='gradient'>
      </div>
      <div>
        <div class='title'>{{title}}</div>
        <p class='description'>{{desc}}</p>
      </div>
      <div class='footer'>
        <div class='logo'>
          <img src='${WHITE_LOGO_BASE64}' alt='' />
        </div>
        <span class='separator'>•</span>
        <span class='swetrix_desc'>Privacy-friendly web analytics</span>
      </div>
    </main>
  </body>
</html>
`

const previewStyles = `
* {
  box-sizing: border-box;
}
:root {
  font-size: 16px;
  font-family: Inter, Ubuntu, sans-serif;
}
body {
  padding: 3.5rem 4rem;
  height: 100vh;
  position: relative;
  margin: 0;
  background: linear-gradient(145deg in oklab, oklch(0.446 0.043 257.281) 28%, oklch(0.627 0.265 303.9) 70%, oklch(0.511 0.262 276.966) 100%);
}
main {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  isolation: isolate;
}
.gradient {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: -1;
  filter: blur(56px);
  background: radial-gradient(900px 600px at 20% 25%, rgba(0, 0, 0, .28), transparent 60%);
}
.footer {
  position: relative;
  display: flex;
  align-items: center;
  gap: .75rem;
  font-size: 1.85rem;
  font-weight: 400;
  color: white;
}
.separator { opacity: .4; }
.swetrix_desc {
  position: static;
  font-weight: 400;
}
.logo {
  width: 200px;
  height: 44px;
  margin-top: -0.5rem;
}
.logo img {
  width: 100%;
  height: 100%;
}
.title {
  font-size: {{fontSize}};
  text-transform: none;
  line-height: 1.05;
  margin: 0.25rem 0;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-wrap: balance;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  hyphens: auto;
  max-width: 1000px;
  color: #ffffff;
}
.description {
  margin-top: 3rem;
  font-size: 2.7rem;
  letter-spacing: 0.05em;
  font-weight: 500;
  color: #ffffff;
}
`

// Get dynamic font size for title depending on its length
function getFontSize(title: string) {
  if (!title) return ''
  const titleLength = title.length
  if (titleLength > 55) return '2.75rem'
  if (titleLength > 35) return '3.25rem'
  if (titleLength > 25) return '4.25rem'
  return '4.75rem'
}

const getCompiledStyles = (name: string): string => {
  return handlebars.compile(previewStyles)({
    fontSize: getFontSize(name),
  })
}

const getCompiledHTML = (title: string, desc: string, styles: string) => {
  return handlebars.compile(previewHTML)({
    title,
    desc,
    styles,
  })
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
          'project.botsProtectionLevel',
          'project.captchaSecretKey',
          'project.isCaptchaEnabled',
          'project.passwordHash',
          'project.isPasswordProtected',
          'admin.id',
          'admin.dashboardBlockReason',
          'admin.isAccountBillingSuspended',
          'organisation.id',
          'organisationMembers.role',
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
        .select(['share.role', 'user.id'])
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
  // with necessary relations needed for the allowedToView and allowedToManage methods
  async getFullProject(
    pid: string,
    userId?: string,
    additionalRelations: string[] = [],
  ) {
    const query: FindOneOptions<Project> = {
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
            user: {
              id: true,
            },
          },
        },
      },
    }

    if (userId) {
      query.where = {
        id: pid,
        admin: { id: userId },
      } as FindOptionsWhere<Project>
    }

    return this.projectsRepository.findOne(query)
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
      .leftJoin('project.admin', 'admin')
      .leftJoin('project.share', 'share')
      .leftJoin('share.user', 'sharedUser')
      .leftJoin('project.organisation', 'organisation')
      .leftJoin('organisation.members', 'organisationMembers')
      .leftJoin('organisationMembers.user', 'organisationUser')
      .where(
        new Brackets(qb => {
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

    // Add sorting based on options.sort
    switch (sort) {
      case 'alpha_asc':
        queryBuilder.orderBy('project.name', 'ASC')
        break
      case 'alpha_desc':
        queryBuilder.orderBy('project.name', 'DESC')
        break
      case 'date_asc':
        queryBuilder.orderBy('project.created', 'ASC')
        break
      case 'date_desc':
        queryBuilder.orderBy('project.created', 'DESC')
        break
      default:
        queryBuilder.orderBy('project.name', 'ASC')
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
        new Brackets(qb => {
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

  async create(project: DeepPartial<Project>) {
    return this.projectsRepository.save(project)
  }

  async update(
    where: FindOptionsWhere<Project>,
    projectDTO: ProjectDTO | Project,
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

  async deleteMultipleShare(where: string) {
    return this.projectShareRepository
      .createQueryBuilder()
      .delete()
      .where(where)
      .execute()
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
      _findIndex(project.share, ({ user }) => user?.id === uid) !== -1 ||
      _findIndex(
        project.organisation?.members,
        member => member.user?.id === uid,
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
        share => share.user?.id === uid && share.role === Role.admin,
      ) !== -1 ||
      _findIndex(
        project.organisation?.members,
        member =>
          member.user?.id === uid &&
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
      _map(queries, query =>
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

    _map(projectDTO.origins, host => {
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
    _map(projectDTO.ipBlacklist, ip => {
      if (!net.isIP(_trim(ip)) && !IP_REGEX.test(_trim(ip))) {
        throw new ConflictException(`IP address ${ip} is not correct`)
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
        const params = { pids: pidChunk }

        const selector = `
          WHERE created BETWEEN '${monthStart}' AND '${monthEnd}'
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
            .then(resultSet => resultSet.json()),
          clickhouse
            .query({
              query: countCustomEVQuery,
              query_params: params,
            })
            .then(resultSet => resultSet.json()),
          clickhouse
            .query({
              query: countCaptchaQuery,
              query_params: params,
            })
            .then(resultSet => resultSet.json()),
          clickhouse
            .query({
              query: countErrorsQuery,
              query_params: params,
            })
            .then(resultSet => resultSet.json()),
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
            .then(resultSet => resultSet.json()),
          clickhouse
            .query({
              query: countCustomEVQuery,
              query_params: params,
            })
            .then(resultSet => resultSet.json()),
          clickhouse
            .query({
              query: countCaptchaQuery,
              query_params: params,
            })
            .then(resultSet => resultSet.json()),
          clickhouse
            .query({
              query: countErrorsQuery,
              query_params: params,
            })
            .then(resultSet => resultSet.json()),
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
    return projects.map(project => project.project)
  }

  async getOwnProject(projectId: string, userId: string) {
    return this.projectsRepository.findOne({
      where: { id: projectId, admin: { id: userId } },
    })
  }

  createUnsubscribeKey(subscriberId: string): string {
    return encodeURIComponent(
      CryptoJS.Rabbit.encrypt(
        subscriberId,
        EMAIL_ACTION_ENCRYPTION_KEY,
      ).toString(),
    )
  }

  decryptUnsubscribeKey(token: string): string {
    const bytes = CryptoJS.Rabbit.decrypt(
      decodeURIComponent(token),
      EMAIL_ACTION_ENCRYPTION_KEY,
    )
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

  getOgHTML(name: string, desc = '8k visitors in the last month') {
    const styles = getCompiledStyles(name)
    const html = getCompiledHTML(name, desc, styles)

    return html
  }

  async getOgImage(pid: string, name: string) {
    const from = dayjs
      .utc()
      .subtract(1, 'month')
      .startOf('month')
      .format('YYYY-MM-DD 00:00:00')
    const to = dayjs
      .utc()
      .subtract(1, 'month')
      .endOf('month')
      .format('YYYY-MM-DD 23:59:59')

    const formatted = nFormatter(
      await this.countVisitorsFromTo(pid, from, to),
      0,
    )

    const desc = `${formatted} visitors in the last month`

    const html = this.getOgHTML(name, desc)

    const browser = await puppeteer.launch({
      headless: true,
      args: browserArgs,
      defaultViewport: {
        width: 1200,
        height: 630,
        deviceScaleFactor: 1,
      },
    })
    const page = await browser.newPage()

    // Set the content to our rendered HTML
    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    const image = await page.screenshot({
      type: 'jpeg',
    })
    await browser.close()

    return image
  }

  async countVisitorsFromTo(
    pid: string,
    from: string,
    to: string,
  ): Promise<number> {
    const query = `
      SELECT
        count(DISTINCT psid) AS count
      FROM analytics
      WHERE
        pid = {pid:FixedString(12)}
        AND created BETWEEN {from:String} AND {to:String}
    `
    const params = { pid, from, to }
    let count = 0

    try {
      const { data } = await clickhouse
        .query({
          query,
          query_params: params,
        })
        .then(resultSet => resultSet.json())

      count = data[0]['count']
    } catch (reason) {
      console.error(
        '[ERROR](project service -> countVisitorsFromTo) Error while counting visitors',
        reason,
      )
    }

    return count
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

    paginated.results = _map(paginated.results, project => {
      const userShare = project.share?.find(share => share.user?.id === userId)
      const organisationMembership = project.organisation?.members?.find(
        member => member.user?.id === userId,
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
        role,
        passwordHash: undefined,
        admin: undefined,
      }
    })

    return paginated
  }
}
