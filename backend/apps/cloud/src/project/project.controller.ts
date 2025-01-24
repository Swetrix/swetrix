/* eslint-disable no-await-in-loop */
import {
  Controller,
  Body,
  Query,
  Param,
  UseGuards,
  Get,
  Post,
  Put,
  Delete,
  BadRequestException,
  HttpCode,
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Headers,
  Header,
  Patch,
  ConflictException,
  Res,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { Response } from 'express'
import {
  ApiTags,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger'
import { Equal } from 'typeorm'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _trim from 'lodash/trim'
import _size from 'lodash/size'
import _includes from 'lodash/includes'
import _isBoolean from 'lodash/isBoolean'
import _omit from 'lodash/omit'
import _split from 'lodash/split'
import _head from 'lodash/head'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import dayjs from 'dayjs'

import { hash } from 'bcrypt'
import { JwtAccessTokenGuard } from '../auth/guards'
import { Auth, Public } from '../auth/decorators'
import { isValidDate } from '../analytics/analytics.service'
import {
  ProjectService,
  processProjectUser,
  deleteProjectRedis,
  generateProjectId,
} from './project.service'
import { UserType, PlanCode } from '../user/entities/user.entity'
import { ActionTokenType } from '../action-tokens/action-token.entity'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { MailerService } from '../mailer/mailer.service'
import { LetterTemplate } from '../mailer/letter'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Pagination } from '../common/pagination/pagination'
import { Project } from './entity/project.entity'
import { ProjectShare, roles } from './entity/project-share.entity'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { UserService } from '../user/user.service'
import { AppLoggerService } from '../logger/logger.service'
import {
  isValidPID,
  PROJECT_INVITE_EXPIRE,
  CAPTCHA_SECRET_KEY_LENGTH,
  isDevelopment,
  PRODUCTION_ORIGIN,
  MAX_FUNNELS,
} from '../common/constants'
import { clickhouse } from '../common/integrations/clickhouse'
import { generateRandomString } from '../common/utils'
import {
  AddSubscriberParamsDto,
  AddSubscriberBodyDto,
  ConfirmSubscriberInviteParamsDto,
  ConfirmSubscriberInviteQueriesDto,
  GetSubscribersParamsDto,
  GetSubscribersQueriesDto,
  UpdateSubscriberParamsDto,
  UpdateSubscriberBodyDto,
  RemoveSubscriberParamsDto,
  TransferProjectBodyDto,
  ConfirmTransferProjectQueriesDto,
  CancelTransferProjectQueriesDto,
  UpdateProjectDto,
  CreateProjectDTO,
  ProjectDTO,
  ShareDTO,
  ShareUpdateDTO,
  FunnelCreateDTO,
  FunnelUpdateDTO,
} from './dto'
import { ProjectsViewsRepository } from './repositories/projects-views.repository'
import { ProjectViewEntity } from './entity/project-view.entity'
import { ProjectIdDto } from './dto/project-id.dto'
import { CreateProjectViewDto } from './dto/create-project-view.dto'
import { UpdateProjectViewDto } from './dto/update-project-view.dto'
import { ProjectViewIdsDto } from './dto/project-view-ids.dto'
import { CreateMonitorHttpRequestDTO } from './dto/create-monitor.dto'
import { MonitorEntity } from './entity/monitor.entity'
import { UpdateMonitorHttpRequestDTO } from './dto/update-monitor.dto'
import { BulkAddUsersDto } from './dto/bulk-add-users.dto'
import { BulkAddUsersResponse } from './interfaces/bulk-add-users'
import { OrganisationService } from '../organisation/organisation.service'
import { Organisation } from '../organisation/entity/organisation.entity'
import { ProjectOrganisationDto } from './dto/project-organisation.dto'
import { ProjectExtraService } from './project-extra.service'

const PROJECTS_MAXIMUM = 50

const isValidShareDTO = (share: ShareDTO): boolean => {
  return !_isEmpty(_trim(share.email)) && _includes(roles, share.role)
}

const isValidUpdateShareDTO = (share: ShareUpdateDTO): boolean => {
  return _includes(roles, share.role)
}

@ApiTags('Project')
@Controller(['project', 'v1/project'])
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly userService: UserService,
    private readonly logger: AppLoggerService,
    private readonly actionTokensService: ActionTokensService,
    private readonly mailerService: MailerService,
    private readonly projectsViewsRepository: ProjectsViewsRepository,
    private readonly organisationService: OrganisationService,
    private readonly projectExtraService: ProjectExtraService,
  ) {}

  @ApiBearerAuth()
  @Get('/')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'mode',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'timeFrame',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
  })
  @ApiResponse({ status: 200, type: [Project] })
  @Auth([], true)
  async get(
    @CurrentUserId() userId: string,
    @Query('take') take: number | undefined,
    @Query('skip') skip: number | undefined,
    @Query('search') search: string | undefined,
    @Query('mode')
    mode:
      | 'default'
      | 'high-traffic'
      | 'low-traffic'
      | 'performance'
      | 'lost-traffic'
      | undefined,
    @Query('period')
    period: '1h' | '1d' | '7d' | '4w' | '3M' | '12M' | '24M' | 'all' = '7d',
    @Query('use-hostname-navigation')
    useHostnameNavigation: string = 'false',
    @Query('sort')
    sort?: 'alpha_asc' | 'alpha_desc' | 'date_asc' | 'date_desc',
  ): Promise<Pagination<Project> | Project[] | object> {
    const isHostnameNavigationEnabled = useHostnameNavigation === 'true'

    this.logger.log(
      {
        userId,
        take,
        skip,
        mode,
        timeFrame: period,
        useHostnameNavigation,
        sort,
      },
      'GET /project',
    )

    const validPeriods = ['1h', '1d', '7d', '4w', '3M', '12M', '24M', 'all']

    if (!validPeriods.includes(period)) {
      throw new UnprocessableEntityException(
        `The provided timeFrame is incorrect. It should be one of: ${validPeriods.join(', ')}`,
      )
    }

    if (!mode || mode === 'default') {
      let paginated

      if (isHostnameNavigationEnabled) {
        paginated = await this.projectExtraService.paginateHostnameNavigation(
          {
            take,
            skip,
            period,
            sort,
          },
          userId,
          search,
        )
      } else {
        paginated = await this.projectService.paginate(
          {
            take,
            skip,
          },
          userId,
          search,
          sort,
        )
      }

      return this.projectService.processDefaultResults(paginated, userId)
    }

    return this.projectExtraService.paginateByTraffic(
      {
        take,
        skip,
        mode,
        period,
        sort,
      },
      userId,
      search,
      isHostnameNavigationEnabled,
    )
  }

  @ApiBearerAuth()
  @Get('/available-for-organisation')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, type: [Project] })
  @Auth([], true)
  async getAvailableProjectsForOrganization(
    @CurrentUserId() userId: string,
    @Query('take') take: number | undefined,
    @Query('skip') skip: number | undefined,
    @Query('search') search: string | undefined,
  ): Promise<Pagination<Project> | Project[] | object> {
    this.logger.log(
      { userId, take, skip },
      'GET /project/available-for-organisation',
    )

    const paginated = await this.projectService.paginateForOrganisation(
      { take, skip },
      userId,
      search,
    )

    return paginated
  }

  @ApiBearerAuth()
  @Post('/admin/:id')
  @ApiResponse({ status: 201, type: Project })
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async createForAdmin(
    @Param('id') userId: string,
    @Body() projectDTO: ProjectDTO,
  ): Promise<Project> {
    this.logger.log({ userId, projectDTO }, 'POST /project/admin/:id')

    const user = await this.userService.findOne({
      where: { id: userId },
      relations: ['projects'],
    })
    const { maxProjects = PROJECTS_MAXIMUM } = user

    if (!user.isActive) {
      throw new ForbiddenException(
        "User's email address has to be verified first",
      )
    }

    if (_size(user.projects) >= maxProjects) {
      throw new ForbiddenException(
        `The user's plan supports maximum of ${maxProjects} projects`,
      )
    }

    this.projectService.validateProject(projectDTO)
    await this.projectService.checkIfIDUnique(projectDTO.id)

    try {
      const project = new Project()
      Object.assign(project, projectDTO)
      project.origins = _map(projectDTO.origins, _trim) as string[]

      const newProject = await this.projectService.create(project)
      user.projects.push(project)

      await this.userService.create(user)

      return newProject
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        if (e.sqlMessage.includes(projectDTO.id)) {
          throw new BadRequestException(
            'Project with selected ID already exists',
          )
        }
      }

      throw new BadRequestException(e)
    }
  }

  @ApiBearerAuth()
  @Post('/')
  @ApiResponse({ status: 201, type: Project })
  @Auth([], true)
  async create(
    @Body() projectDTO: CreateProjectDTO,
    @CurrentUserId() userId: string,
  ): Promise<Omit<Project, 'passwordHash'>> {
    this.logger.log({ projectDTO, userId }, 'POST /project')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const initiatingUser = await this.userService.findOne({
      where: { id: userId },
      relations: ['projects'],
    })
    const { maxProjects = PROJECTS_MAXIMUM } = initiatingUser

    if (!initiatingUser.isActive) {
      throw new ForbiddenException('Please, verify your email address first')
    }

    let user = initiatingUser

    if (projectDTO.organisationId) {
      const canManage = await this.organisationService.canManageOrganisation(
        projectDTO.organisationId,
        userId,
      )

      if (!canManage) {
        throw new ForbiddenException(
          'You are not allowed to add projects to the selected organisation',
        )
      }

      user = await this.organisationService.getOrganisationOwner(
        projectDTO.organisationId,
      )
    }

    if (user.planCode === PlanCode.none) {
      throw new HttpException(
        'You cannot create new projects due to no active subscription. Please upgrade your account plan to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    if (user.isAccountBillingSuspended) {
      throw new HttpException(
        'This account is currently suspended, this is because of a billing issue. Please resolve the issue to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    if (projectDTO.isCaptcha) {
      if (
        _size(
          _filter(
            user.projects,
            (project: Project) => project.isCaptchaProject,
          ),
        ) >= maxProjects
      ) {
        throw new HttpException(
          `You cannot create more than ${maxProjects} projects on your account plan. Please upgrade to be able to create more projects.`,
          HttpStatus.PAYMENT_REQUIRED,
        )
      }
    } else if (
      _size(
        _filter(
          user.projects,
          (project: Project) => project.isAnalyticsProject,
        ),
      ) >= maxProjects
    ) {
      throw new ForbiddenException(
        `You cannot create more than ${maxProjects} projects on your account plan. Please upgrade to be able to create more projects.`,
      )
    }

    this.projectService.validateProject(projectDTO as ProjectDTO, true)

    let pid = generateProjectId()

    while (!(await this.projectService.isPIDUnique(pid))) {
      pid = generateProjectId()
    }

    try {
      const project = {
        id: pid,
        name: _trim(projectDTO.name),
        origins: [],
        active: true,

        admin: {
          id: user.id,
        },
      } as Project

      if (projectDTO.isCaptcha) {
        project.isCaptchaProject = true
        project.isAnalyticsProject = false
        project.isCaptchaEnabled = true
        project.captchaSecretKey = generateRandomString(
          CAPTCHA_SECRET_KEY_LENGTH,
        )
      }

      if (projectDTO.organisationId) {
        project.organisation = {
          id: projectDTO.organisationId,
        } as Organisation
      }

      if (projectDTO.isPasswordProtected && projectDTO.password) {
        project.isPasswordProtected = true
        project.passwordHash = await hash(projectDTO.password, 10)
      }

      const newProject = await this.projectService.create(project)

      return _omit(newProject, ['passwordHash'])
    } catch (reason) {
      console.error('[ERROR] Failed to create a new project:')
      console.error(reason)
      throw new BadRequestException('Failed to create a new project')
    }
  }

  @Post('/funnel')
  @ApiResponse({ status: 201 })
  @Auth([], true)
  async createFunnel(
    @Body() funnelDTO: FunnelCreateDTO,
    @CurrentUserId() userId: string,
  ): Promise<any> {
    this.logger.log({ funnelDTO, userId }, 'POST /project/funnel')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const user = await this.userService.findOne({
      where: { id: userId },
      relations: ['projects'],
    })

    if (!user.isActive) {
      throw new ForbiddenException('Please, verify your email address first')
    }

    if (user.planCode === PlanCode.none) {
      throw new HttpException(
        'You cannot create new funnels due to no active subscription. Please upgrade your account plan to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    if (user.isAccountBillingSuspended) {
      throw new HttpException(
        'This account is currently suspended, this is because of a billing issue. Please resolve the issue to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    const project = await this.projectService.getFullProject(
      funnelDTO.pid,
      userId,
    )

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    this.projectService.allowedToManage(project, userId, user.roles)

    return this.projectService.createFunnel(project.id, funnelDTO)
  }

  @Patch('/funnel')
  @ApiResponse({ status: 200 })
  @Auth([], true)
  async updateFunnel(
    @Body() funnelDTO: FunnelUpdateDTO,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    this.logger.log({ funnelDTO, userId }, 'PATCH /project/funnel')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const user = await this.userService.findOne({
      where: { id: userId },
      relations: ['projects'],
    })

    if (!user.isActive) {
      throw new ForbiddenException('Please, verify your email address first')
    }

    if (user.planCode === PlanCode.none) {
      throw new HttpException(
        'You cannot update funnels due to no active subscription. Please upgrade your account plan to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    if (user.isAccountBillingSuspended) {
      throw new HttpException(
        'This account is currently suspended, this is because of a billing issue. Please resolve the issue to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    const project = await this.projectService.getFullProject(
      funnelDTO.pid,
      userId,
      ['funnels'],
    )

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    this.projectService.allowedToManage(project, userId, user.roles)

    if (_size(project.funnels) >= MAX_FUNNELS) {
      throw new ForbiddenException(
        `You cannot create more than ${MAX_FUNNELS}. Please contact us to increase the limit.`,
      )
    }

    const oldFunnel = await this.projectService.getFunnel(
      funnelDTO.id,
      project.id,
    )

    if (!oldFunnel) {
      throw new NotFoundException('Funnel not found.')
    }

    await this.projectService.updateFunnel({
      id: funnelDTO.id,
      name: funnelDTO.name,
      steps: funnelDTO.steps,
    } as FunnelUpdateDTO)
  }

  @Delete('/funnel/:id/:pid')
  @ApiResponse({ status: 200 })
  @Auth([], true)
  async deleteFunnel(
    @Param('id') id: string,
    @Param('pid') pid: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    this.logger.log({ id, userId }, 'PATCH /project/funnel')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(pid, userId)

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(project, userId)

    const oldFunnel = await this.projectService.getFunnel(id, project.id)

    if (!oldFunnel) {
      throw new NotFoundException('Funnel not found.')
    }

    await this.projectService.deleteFunnel(id)
  }

  @Get('/funnels/:pid')
  @ApiResponse({ status: 200 })
  @Auth([], true)
  async getFunnels(
    @Param('pid') pid: string,
    @CurrentUserId() userId: string,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<any> {
    this.logger.log({ pid, userId }, 'PATCH /project/funnel')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(pid, userId)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    this.projectService.allowedToView(project, userId, headers['x-password'])

    return this.projectService.getFunnels(project.id)
  }

  @ApiBearerAuth()
  @Delete('/reset/:id')
  @HttpCode(204)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async reset(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    this.logger.log({ uid, id }, 'DELETE /project/reset/:id')
    if (!isValidPID(id)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const project = await this.projectService.getOwnProject(id, uid)

    if (_isEmpty(project)) {
      throw new NotFoundException(`Project with ID ${id} does not exist`)
    }

    const queries = [
      'DELETE FROM analytics WHERE pid={pid:FixedString(12)}',
      'DELETE FROM customEV WHERE pid={pid:FixedString(12)}',
      'DELETE FROM performance WHERE pid={pid:FixedString(12)}',
      'DELETE FROM errors WHERE pid={pid:FixedString(12)}',
      'DELETE FROM error_statuses WHERE pid={pid:FixedString(12)}',
    ]

    try {
      const promises = _map(queries, async query =>
        clickhouse.command({
          query,
          query_params: {
            pid: id,
          },
        }),
      )

      await Promise.all(promises)
      return 'Project resetted successfully'
    } catch (e) {
      this.logger.error(e)
      return 'Error while resetting your project'
    }
  }

  @ApiBearerAuth()
  @Delete('/captcha/reset/:id')
  @HttpCode(204)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async resetCAPTCHA(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    this.logger.log({ uid, id }, 'DELETE /project/captcha/reset/:id')
    if (!isValidPID(id)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const user = await this.userService.findOne({ where: { id: uid } })
    const project = await this.projectService.getFullProject(id)

    if (_isEmpty(project)) {
      throw new NotFoundException(`Project with ID ${id} does not exist`)
    }

    this.projectService.allowedToManage(project, uid, user.roles)

    try {
      await clickhouse.command({
        query: 'DELETE FROM captcha WHERE pid={pid:FixedString(12)}',
        query_params: {
          pid: id,
        },
      })
      return 'CAPTCHA project resetted successfully'
    } catch (e) {
      this.logger.error(e)
      return 'Error while resetting your CAPTCHA project'
    }
  }

  @ApiBearerAuth()
  @Post('/secret-gen/:pid')
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 200, description: 'A regenerated CAPTCHA secret key' })
  async secretGen(
    @Param('pid') pid: string,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    this.logger.log({ uid, pid }, 'POST /project/secret-gen/:pid')

    if (!isValidPID(pid)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const project = await this.projectService.getFullProject(pid)
    const user = await this.userService.findOne({ where: { id: uid } })

    if (_isEmpty(project)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(project, uid, user.roles)

    const secret = generateRandomString(CAPTCHA_SECRET_KEY_LENGTH)

    // @ts-ignore
    await this.projectService.update({ id: pid }, { captchaSecretKey: secret })

    await deleteProjectRedis(pid)

    return secret
  }

  @ApiBearerAuth()
  @Delete('/captcha/:id')
  @HttpCode(204)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async deleteCAPTCHA(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    this.logger.log({ uid, id }, 'DELETE /project/captcha/:id')

    if (!isValidPID(id)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const user = await this.userService.findOne({ where: { id: uid } })
    const project = await this.projectService.getFullProject(id)

    if (_isEmpty(project)) {
      throw new NotFoundException(`Project with ID ${id} does not exist`)
    }

    this.projectService.allowedToManage(project, uid, user.roles)

    try {
      await clickhouse.command({
        query: 'DELETE FROM captcha WHERE pid={pid:FixedString(12)}',
        query_params: {
          pid: id,
        },
      })

      project.captchaSecretKey = null
      project.isCaptchaEnabled = false
      project.isCaptchaProject = false

      await this.projectService.update({ id }, project)

      return 'CAPTCHA project deleted successfully'
    } catch (e) {
      this.logger.error(e)
      return 'Error while deleting your CAPTCHA project'
    }
  }

  @Delete('/partially/:pid')
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Date in ISO format',
    example: '2020-01-01T00:00:00.000Z',
    type: 'string',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'Date in ISO format',
    example: '2020-01-01T00:00:00.000Z',
    type: 'string',
  })
  @ApiResponse({ status: 200 })
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  async deletePartially(
    @Param('pid') pid: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUserId() uid: string,
  ): Promise<void> {
    this.logger.log({ from, to, pid }, 'DELETE /partially/:id')

    if (!isValidPID(pid)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    from = _head(_split(from, 'T'))
    to = _head(_split(to, 'T'))

    if (!isValidDate(from)) {
      throw new BadRequestException("The provided 'from' date is incorrect")
    }

    if (!isValidDate(to)) {
      throw new BadRequestException("The provided 'to' date is incorrect")
    }

    const project = await this.projectService.getFullProject(pid)

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(project, uid)

    from = dayjs(from).format('YYYY-MM-DD')
    to = dayjs(to).format('YYYY-MM-DD 23:59:59')

    await this.projectService.removeDataFromClickhouse(pid, from, to)
  }

  @ApiBearerAuth()
  @Post('organisation/:orgId')
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @Auth([], true)
  async addProject(
    @Param('orgId') orgId: string,
    @Body() addProjectDTO: ProjectIdDto,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log(
      { uid, orgId, addProjectDTO },
      'POST /project/organisation/:orgId',
    )

    const organisation = await this.organisationService.findOne({
      where: { id: orgId },
      relations: ['members', 'members.user', 'projects'],
    })

    if (_isEmpty(organisation)) {
      throw new NotFoundException(
        `Organisation with ID ${orgId} does not exist`,
      )
    }

    await this.organisationService.validateManageAccess(organisation, uid)

    return this.projectService.addProjectToOrganisation(
      organisation.id,
      addProjectDTO.projectId,
    )
  }

  @ApiBearerAuth()
  @Delete('organisation/:orgId/:projectId')
  @HttpCode(204)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @Auth([], true)
  async removeProject(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log(
      { uid, orgId, projectId },
      'DELETE /organisation/:orgId/project/:projectId',
    )

    const organisation = await this.organisationService.findOne({
      where: { id: orgId },
      relations: ['members', 'members.user', 'projects'],
    })

    if (_isEmpty(organisation)) {
      throw new NotFoundException(
        `Organisation with ID ${orgId} does not exist`,
      )
    }

    await this.organisationService.validateManageAccess(organisation, uid)

    await this.projectService.removeProjectFromOrganisation(
      organisation.id,
      projectId,
    )
  }

  @Delete('/reset-filters/:pid')
  @ApiResponse({ status: 200 })
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  async resetFilters(
    @Param('pid') pid: string,
    @Query('type') type: string,
    @Query('filters') rawFilters: string,
    @CurrentUserId() uid: string,
  ): Promise<void> {
    this.logger.log({ pid }, 'DELETE /reset-filters/:pid')

    if (!isValidPID(pid)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const project = await this.projectService.getFullProject(pid)

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(project, uid)

    const filters = JSON.parse(rawFilters)

    await this.projectService.deleteByFilters(pid, type, filters)
  }

  @ApiBearerAuth()
  @Post('/bulk-add-users')
  @HttpCode(200)
  @Auth([], true)
  @ApiResponse({ status: 200, type: [BulkAddUsersDto] })
  async bulkAddUsers(
    @Body() bulkAddUsersDto: BulkAddUsersDto,
    @CurrentUserId() uid: string,
  ): Promise<BulkAddUsersResponse[]> {
    this.logger.log({ uid, bulkAddUsersDto }, 'POST /project/bulk-add-users')

    const inviter = await this.userService.findOne({
      where: { id: uid },
      relations: ['projects', 'sharedProjects', 'sharedProjects.project'],
    })

    const results: BulkAddUsersResponse[] = []

    await Promise.all(
      bulkAddUsersDto.users.map(async invitationObject => {
        const invitee = await this.userService.findOne({
          where: { email: invitationObject.email },
          relations: ['sharedProjects'],
        })

        if (!invitee) {
          this.logger.warn(
            `User with email ${invitationObject.email} is not registered`,
          )

          results.push({
            email: invitationObject.email,
            success: false,
            error: 'User with this email is not registered on Swetrix',
            failedProjectIds: [],
          })

          return null
        }

        if (invitee.id === inviter.id) {
          this.logger.warn(
            `Skipping self-share attempt for ${invitationObject.email}`,
          )

          results.push({
            email: invitationObject.email,
            success: false,
            error:
              'User with this email is the same as the inviter initiating this request',
            failedProjectIds: [],
          })

          return null
        }

        const failedProjectIds = []

        const uniqueProjectIds = [...new Set(invitationObject.projectIds)]

        for (const pid of uniqueProjectIds) {
          if (!isValidPID(pid)) {
            this.logger.warn(`Invalid project ID: ${pid}`)
            failedProjectIds.push({
              projectId: pid,
              reason: 'Invalid project ID',
            })
            continue
          }

          const project = await this.projectService.getFullProject(pid)

          if (_isEmpty(project)) {
            this.logger.warn(`Project with ID ${pid} does not exist`)
            failedProjectIds.push({
              projectId: pid,
              reason: 'Project does not exist',
            })
            continue
          }

          try {
            this.projectService.allowedToManage(project, uid, inviter.roles)
          } catch (reason) {
            this.logger.warn(`User ${uid} not allowed to manage project ${pid}`)
            failedProjectIds.push({
              projectId: pid,
              reason: 'Inviter is not allowed to manage this project',
            })
            continue
          }

          const isSharingWithUser = !_isEmpty(
            _find(project.share, share => share.user?.id === invitee.id),
          )

          if (isSharingWithUser) {
            this.logger.warn(
              `Already sharing project ${pid} with ${invitee.email}`,
            )
            failedProjectIds.push({
              projectId: pid,
              reason: 'Already sharing project with this user',
            })
            continue
          }

          try {
            const share = new ProjectShare()
            share.role = invitationObject.role
            share.user = invitee
            share.project = project
            share.confirmed = true // Auto-confirm since we're not sending invitations

            await this.projectService.createShare(share)

            // Saving share into project
            project.share.push(share)
            await this.projectService.create(project)

            // Saving share into invitees shared projects
            invitee.sharedProjects.push(share)
            await this.userService.create(invitee)

            await deleteProjectRedis(pid)
          } catch (reason) {
            this.logger.error(
              `[ERROR] Could not share project (pid: ${pid}, invitee ID: ${invitee.id}): ${reason}`,
            )
            failedProjectIds.push({
              projectId: pid,
              reason: 'Internal error',
            })
          }
        }

        results.push({
          email: invitationObject.email,
          success: failedProjectIds.length === 0,
          failedProjectIds,
          error: null,
        })

        return null
      }),
    )

    return results
  }

  @ApiBearerAuth()
  @Post('/:pid/share')
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 200, type: Project })
  async share(
    @Param('pid') pid: string,
    @Body() shareDTO: ShareDTO,
    @CurrentUserId() uid: string,
    @Headers() headers,
  ): Promise<Project> {
    this.logger.log({ uid, pid, shareDTO }, 'POST /project/:pid/share')

    if (!isValidPID(pid)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    if (!isValidShareDTO(shareDTO)) {
      throw new BadRequestException('The provided ShareDTO is incorrect')
    }

    const user = await this.userService.findOne({ where: { id: uid } })
    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException(`Project with ID ${pid} does not exist`)
    }

    this.projectService.allowedToManage(project, uid, user.roles)

    const invitee = await this.userService.findOne({
      where: { email: shareDTO.email },
      relations: ['sharedProjects'],
    })

    if (!invitee) {
      throw new NotFoundException(
        `User with email ${shareDTO.email} is not registered on Swetrix`,
      )
    }

    if (invitee.id === user.id) {
      throw new BadRequestException('You cannot share with yourself')
    }

    const isSharingWithUser = !_isEmpty(
      _find(project.share, share => share.user?.id === invitee.id),
    )

    if (isSharingWithUser) {
      throw new BadRequestException(
        `You're already sharing the project with ${invitee.email}`,
      )
    }

    try {
      const share = new ProjectShare()
      share.role = shareDTO.role
      share.user = invitee
      share.project = project

      await this.projectService.createShare(share)

      // Saving share into project
      project.share.push(share)
      await this.projectService.create(project)

      // Saving share into invitees shared projects
      invitee.sharedProjects.push(share)
      await this.userService.create(invitee)

      // TODO: Implement link expiration
      const actionToken = await this.actionTokensService.createForUser(
        user,
        ActionTokenType.PROJECT_SHARE,
        share.id,
      )
      const url = `${
        isDevelopment ? headers.origin : PRODUCTION_ORIGIN
      }/share/${actionToken.id}`
      await this.mailerService.sendEmail(
        invitee.email,
        LetterTemplate.ProjectInvitation,
        {
          url,
          email: user.email,
          name: project.name,
          role: share.role,
          expiration: PROJECT_INVITE_EXPIRE,
        },
      )

      const updatedProject = await this.projectService.findOne({
        where: { id: pid },
        relations: ['share', 'share.user'],
      })

      await deleteProjectRedis(pid)
      return processProjectUser(updatedProject)
    } catch (e) {
      console.error(
        `[ERROR] Could not share project (pid: ${project.id}, invitee ID: ${invitee.id}): ${e}`,
      )
      throw new BadRequestException(e)
    }
  }

  @ApiBearerAuth()
  @Put('/share/:shareId')
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 200, type: Project })
  async updateShare(
    @Param('shareId') shareId: string,
    @Body() shareDTO: ShareUpdateDTO,
    @CurrentUserId() uid: string,
  ): Promise<ProjectShare> {
    this.logger.log({ uid, shareDTO, shareId }, 'PUT /project/share/:shareId')

    if (!isValidUpdateShareDTO(shareDTO)) {
      throw new BadRequestException('The provided ShareUpdateDTO is incorrect')
    }

    const user = await this.userService.findOne({ where: { id: uid } })
    const share = await this.projectService.findOneShare({
      where: { id: shareId },
      relations: [
        'project',
        'project.admin',
        'project.share',
        'project.share.user',
      ],
    })

    if (_isEmpty(share)) {
      throw new NotFoundException(`Share with ID ${shareId} does not exist`)
    }

    // TODO: ORG
    this.projectService.allowedToManage(share.project, uid, user.roles)

    const adminShare = _find(
      share.project.share,
      (_share: ProjectShare) => _share.user?.id === uid,
    )

    if (adminShare?.id === shareId) {
      throw new NotFoundException('You cannot edit your own role')
    }

    const { role } = shareDTO
    await this.projectService.updateShare(shareId, {
      role,
    })

    await deleteProjectRedis(share.project.id)
    return this.projectService.findOneShare({
      where: { id: shareId },
    })
  }

  @ApiBearerAuth()
  @HttpCode(204)
  // @UseGuards(JwtAccessTokenGuard, RolesGuard)
  // @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @Public()
  @ApiResponse({ status: 204, description: 'Empty body' })
  @Get('/share/:id')
  async acceptShare(@Param('id') id: string): Promise<any> {
    this.logger.log({ id }, 'GET /project/share/:id')
    let actionToken

    try {
      actionToken = await this.actionTokensService.find(id)
    } catch {
      throw new BadRequestException('Incorrect token provided')
    }

    if (actionToken.action === ActionTokenType.PROJECT_SHARE) {
      const { newValue: shareId, id: tokenID } = actionToken

      const share = await this.projectService.findOneShare({
        where: { id: shareId },
      })
      share.confirmed = true

      if (_isEmpty(share)) {
        throw new BadRequestException('The provided share ID is not valid')
      }

      // if (share.user?.id !== user.id) {
      //   throw new BadRequestException('You are not allowed to manage this share')
      // }

      await this.projectService.updateShare(shareId, share)
      await this.actionTokensService.delete(tokenID)
    }
  }

  @Post('transfer')
  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  async transferProject(
    @Body() body: TransferProjectBodyDto,
    @CurrentUserId() userId: string,
    @Headers() headers: { origin: string },
  ) {
    this.logger.log({ body }, 'POST /project/transfer')

    const project = await this.projectService.getOwnProject(
      body.projectId,
      userId,
    )

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    const user = await this.userService.findOne({
      where: { email: body.email },
    })

    if (!user) {
      throw new NotFoundException('User not found.')
    }

    if (user.id === userId) {
      throw new ConflictException('You cannot transfer project to yourself.')
    }

    await this.projectService.transferProject(
      body.projectId,
      project.name,
      user.id,
      user.email,
      headers.origin,
    )
  }

  @Get('transfer')
  async confirmTransferProject(
    @Query() queries: ConfirmTransferProjectQueriesDto,
  ) {
    this.logger.log({ queries }, 'GET /project/transfer')

    const actionToken = await this.actionTokensService.getActionToken(
      queries.token,
    )

    if (
      !actionToken ||
      actionToken.action !== ActionTokenType.TRANSFER_PROJECT
    ) {
      throw new BadRequestException('Invalid token.')
    }

    const project = await this.projectService.findOne({
      where: { id: actionToken.newValue },
      relations: ['admin'],
    })

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    await this.projectService.confirmTransferProject(
      actionToken.newValue,
      actionToken.user.id,
      project.admin.id,
      actionToken.id,
    )
  }

  @Delete('transfer')
  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  async cancelTransferProject(
    @Query() queries: CancelTransferProjectQueriesDto,
  ) {
    this.logger.log({ queries }, 'DELETE /project/transfer')

    const actionToken = await this.actionTokensService.getActionToken(
      queries.token,
    )

    if (
      !actionToken ||
      actionToken.action !== ActionTokenType.TRANSFER_PROJECT
    ) {
      throw new BadRequestException('Invalid token.')
    }

    const project = await this.projectService.findOne({
      where: { id: actionToken.newValue },
    })

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    await this.projectService.cancelTransferProject(actionToken.id, project.id)
  }

  @Delete(':projectId/subscribers/:subscriberId')
  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  async removeSubscriber(
    @Param() params: RemoveSubscriberParamsDto,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    this.logger.log(
      { params },
      'DELETE /project/:projectId/subscribers/:subscriberId',
    )

    const project = await this.projectService.getFullProject(params.projectId)

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      userId,
      [],
      "You are not allowed to manage this project's subscribers",
    )

    const subscriber = await this.projectService.getSubscriber(
      params.projectId,
      params.subscriberId,
    )

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found')
    }

    await this.projectService.removeSubscriber(
      params.projectId,
      params.subscriberId,
    )
  }

  @Post(':projectId/subscribers')
  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  async addSubscriber(
    @Param() params: AddSubscriberParamsDto,
    @Body() body: AddSubscriberBodyDto,
    @Headers() headers: { origin: string },
    @CurrentUserId() userId: string,
  ) {
    this.logger.log({ params, body }, 'POST /project/:projectId/subscribers')

    const project = await this.projectService.getFullProject(params.projectId)

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      userId,
      [],
      "You are not allowed to manage this project's subscribers",
    )

    const user = await this.userService.findOne({ where: { id: userId } })

    if (user.email === body.email) {
      throw new BadRequestException('You cannot subscribe to your own project.')
    }

    const subscriber = await this.projectService.getSubscriberByEmail(
      params.projectId,
      body.email,
    )

    if (subscriber) {
      throw new BadRequestException('Subscriber already exists.')
    }

    return this.projectService.addSubscriber({
      userId,
      projectId: params.projectId,
      projectName: project.name,
      email: body.email,
      reportFrequency: body.reportFrequency,
      origin: isDevelopment ? headers.origin : PRODUCTION_ORIGIN,
    })
  }

  @Get('password/:projectId')
  @Auth([], true, true)
  @ApiResponse({ status: 200, type: Project })
  async checkPassword(
    @Param('projectId') projectId: string,
    @CurrentUserId() userId: string,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<boolean> {
    this.logger.log({ projectId }, 'GET /project/password/:projectId')

    const project = await this.projectService.getFullProject(projectId)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    try {
      this.projectService.allowedToView(project, userId, headers['x-password'])
    } catch {
      return false
    }

    return true
  }

  @Get(':projectId/subscribers/invite')
  @HttpCode(HttpStatus.OK)
  async confirmSubscriberInvite(
    @Param() params: ConfirmSubscriberInviteParamsDto,
    @Query() queries: ConfirmSubscriberInviteQueriesDto,
  ): Promise<void> {
    this.logger.log(
      { params, queries },
      'GET /project/:projectId/subscribers/invite',
    )

    const project = await this.projectService.findOne({
      where: { id: params.projectId },
    })

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    const actionToken = await this.actionTokensService.getActionToken(
      queries.token,
    )

    if (
      !actionToken ||
      actionToken.action !== ActionTokenType.ADDING_PROJECT_SUBSCRIBER
    ) {
      throw new BadRequestException('Invalid token.')
    }

    const [projectId, subscriberId] = actionToken.newValue.split(':')
    const subscriber = await this.projectService.getSubscriber(
      projectId,
      subscriberId,
    )

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found.')
    }

    await this.projectService.confirmSubscriber(
      projectId,
      subscriberId,
      actionToken.id,
    )
  }

  @Get(':projectId/subscribers')
  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  async getSubscribers(
    @Param() params: GetSubscribersParamsDto,
    @Query() queries: GetSubscribersQueriesDto,
    @CurrentUserId() userId: string,
  ) {
    this.logger.log({ params, queries }, 'GET /project/:projectId/subscribers')

    const project = await this.projectService.getFullProject(params.projectId)

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, userId)

    return this.projectService.getSubscribers(params.projectId, queries)
  }

  @Patch(':projectId/subscribers/:subscriberId')
  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  async updateSubscriber(
    @Param() params: UpdateSubscriberParamsDto,
    @Body() body: UpdateSubscriberBodyDto,
    @CurrentUserId() userId: string,
  ) {
    this.logger.log(
      { params, body },
      'PATCH /project/:projectId/subscribers/:subscriberId',
    )

    const project = await this.projectService.getFullProject(params.projectId)

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToManage(
      project,
      userId,
      [],
      "You are not allowed to manage this project's subscribers",
    )

    const subscriber = await this.projectService.getSubscriber(
      params.projectId,
      params.subscriberId,
    )

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found')
    }

    return this.projectService.updateSubscriber(
      params.projectId,
      params.subscriberId,
      body,
    )
  }

  @Delete('/:id')
  @HttpCode(204)
  @Auth([], true)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async delete(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    this.logger.log({ uid, id }, 'DELETE /project/:id')

    if (!uid) {
      throw new UnauthorizedException('Please auth first')
    }

    if (!isValidPID(id)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const project = await this.projectService.getOwnProject(id, uid)

    if (_isEmpty(project)) {
      throw new NotFoundException(`Project with ID ${id} does not exist`)
    }

    const queries = [
      'DELETE FROM analytics WHERE pid={pid:FixedString(12)}',
      'DELETE FROM customEV WHERE pid={pid:FixedString(12)}',
      'DELETE FROM performance WHERE pid={pid:FixedString(12)}',
      'DELETE FROM errors WHERE pid={pid:FixedString(12)}',
      'DELETE FROM error_statuses WHERE pid={pid:FixedString(12)}',
      'DELETE FROM captcha WHERE pid={pid:FixedString(12)}',
    ]

    try {
      const promises = _map(queries, async query =>
        clickhouse.command({
          query,
          query_params: {
            pid: id,
          },
        }),
      )

      await Promise.all(promises)

      await deleteProjectRedis(id)
    } catch (e) {
      this.logger.error(e)
      return 'Error while deleting your project'
    }

    try {
      if (project.isCaptchaProject) {
        project.isAnalyticsProject = false
        await this.projectService.update({ id }, project)
      } else {
        await this.projectService.deleteMultipleShare(`project = "${id}"`)
        await this.projectService.delete(id)
        await this.deleteCAPTCHA(id, uid)
      }
    } catch (e) {
      this.logger.error(e)
      return 'Error while deleting your project'
    }

    return 'Project deleted successfully'
  }

  // Used to unsubscribe from email reports for 3rd party users (i.e. project-subscriber.entity.ts)
  @Get('/unsubscribe/:token')
  @Public()
  @ApiResponse({ status: 204 })
  async unsubscribeFromEmailReports(
    @Param('token') token: string,
  ): Promise<void> {
    this.logger.log({ token }, 'GET /project/unsubscribe/:token')

    let subscriberId

    try {
      subscriberId = this.projectService.decryptUnsubscribeKey(token)
    } catch {
      throw new NotFoundException('Unsubscribe token is invalid')
    }

    const subscriber = await this.projectService.getSubscriberById(subscriberId)

    if (!subscriber) {
      throw new NotFoundException('Unsubscribe token is invalid')
    }

    await this.projectService.removeSubscriberById(subscriberId)
  }

  @Get('/ogimage/:id')
  @HttpCode(200)
  @Header('Content-Type', 'image/jpeg')
  // 1 day cache
  @Header(
    'Cache-Control',
    'immutable, no-transform, s-max-age=86400, max-age=86400',
  )
  @ApiResponse({ status: 200 })
  async getOgImage(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<any> {
    // TODO: Cache the generated image in the filesystem (or CDN) for 1 day and return it instead of generating it again
    this.logger.log({ id }, 'GET /project/ogimage/:id')

    if (!isValidPID(id)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const project = await this.projectService.findOne({ where: { id } })

    if (_isEmpty(project)) {
      // TODO: Return default image
      throw new NotFoundException('Project not found.')
    }

    if (!project.public) {
      // TODO: Return default image
      throw new ForbiddenException()
    }

    const image = await this.projectService.getOgImage(project.id, project.name)

    res.end(image)
  }

  @Get('/ogimage/:id/html')
  @HttpCode(200)
  @ApiResponse({ status: 200 })
  async getOgHTML(@Param('id') id: string, @Res() res: Response): Promise<any> {
    this.logger.log({ id }, 'GET /project/ogimage/:id')

    if (!isDevelopment) {
      throw new ForbiddenException('This route is only available in dev mode')
    }

    if (!isValidPID(id)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const project = await this.projectService.findOne({ where: { id } })

    if (_isEmpty(project)) {
      throw new NotFoundException('Project not found')
    }

    const html = this.projectService.getOgHTML('My Awesome Project')

    res.send(html)
  }

  @ApiBearerAuth()
  @Patch('/:id/organisation')
  @HttpCode(204)
  @Auth([], true)
  async updateOrganisation(
    @Param('id') id: string,
    @Body() body: ProjectOrganisationDto,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ body }, 'PATCH /project/:id/organisation')

    if (!uid) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(id)

    if (_isEmpty(project)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(project, uid)

    if (body.organisationId) {
      const canManage = await this.organisationService.canManageOrganisation(
        body.organisationId,
        uid,
      )

      if (!canManage) {
        throw new ForbiddenException(
          'You do not have permission to manage this organisation',
        )
      }
    }

    await this.projectService.update({ id }, {
      organisation: { id: body.organisationId || null },
    } as Project)
  }

  @ApiBearerAuth()
  @Put('/:id')
  @HttpCode(200)
  @Auth([], true)
  @ApiResponse({ status: 200, type: Project })
  async update(
    @Param('id') id: string,
    @Body() projectDTO: UpdateProjectDto,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    this.logger.log(
      { ..._omit(projectDTO, ['password']), uid, id },
      'PUT /project/:id',
    )

    if (!uid) {
      throw new UnauthorizedException('Please auth first')
    }

    this.projectService.validateProject(projectDTO)
    const project = await this.projectService.getFullProject(id)
    const user = await this.userService.findOne({ where: { id: uid } })

    if (_isEmpty(project)) {
      throw new NotFoundException()
    }

    this.projectService.allowedToManage(project, uid, user.roles)

    if (_isBoolean(projectDTO.public)) {
      project.public = projectDTO.public
    }

    if (_isBoolean(projectDTO.active)) {
      project.active = projectDTO.active
    }

    if (_isBoolean(projectDTO.isArchived)) {
      project.isArchived = projectDTO.isArchived
    }

    if (projectDTO.origins) {
      project.origins = _map(projectDTO.origins, _trim) as string[]
    } else {
      project.origins = []
    }

    if (projectDTO.ipBlacklist) {
      project.ipBlacklist = _map(projectDTO.ipBlacklist, _trim) as string[]
    } else {
      project.ipBlacklist = null
    }

    if (projectDTO.botsProtectionLevel) {
      project.botsProtectionLevel = projectDTO.botsProtectionLevel
    }

    if (projectDTO.name) {
      project.name = _trim(projectDTO.name)
    }

    if (_isBoolean(projectDTO.isPasswordProtected)) {
      if (projectDTO.isPasswordProtected) {
        if (projectDTO.password) {
          project.isPasswordProtected = true
          project.passwordHash = await hash(projectDTO.password, 10)
        }
      } else {
        project.isPasswordProtected = false
        project.passwordHash = null
      }
    }

    // @ts-expect-error
    await this.projectService.update({ id }, _omit(project, ['share', 'admin']))

    await deleteProjectRedis(id)

    return _omit(project, ['admin', 'passwordHash', 'share'])
  }

  // The routes related to sharing projects feature
  @ApiBearerAuth()
  @Delete('/:pid/:shareId')
  @HttpCode(204)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async deleteShare(
    @Param('pid') pid: string,
    @Param('shareId') shareId: string,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    this.logger.log({ uid, pid, shareId }, 'DELETE /project/:pid/:shareId')

    if (!isValidPID(pid)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException(`Project with ID ${pid} does not exist`)
    }

    const user = await this.userService.findOne({ where: { id: uid } })

    this.projectService.allowedToManage(project, uid, user.roles)

    await deleteProjectRedis(pid)
    await this.projectService.deleteShare(shareId)
  }

  @ApiBearerAuth()
  @Get('/:id')
  @Auth([], true, true)
  @ApiResponse({ status: 200, type: Project })
  async getOne(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<Project | object> {
    this.logger.log({ id }, 'GET /project/:id')
    if (!isValidPID(id)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const project = await this.projectService.getFullProject(id, null, [
      'funnels',
    ])

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    let allowedToViewNoPassword = false

    try {
      this.projectService.allowedToView(project, userId)
      allowedToViewNoPassword = true
    } catch {
      allowedToViewNoPassword = false
    }

    if (
      !allowedToViewNoPassword &&
      project.isPasswordProtected &&
      _isEmpty(headers['x-password'])
    ) {
      return {
        isPasswordProtected: true,
        id: project.id,
      }
    }

    this.projectService.allowedToView(project, userId, headers['x-password'])

    const [isDataExists, isErrorDataExists] = await Promise.all([
      !_isEmpty(
        await this.projectService.getPIDsWhereAnalyticsDataExists([id]),
      ),
      !_isEmpty(await this.projectService.getPIDsWhereErrorsDataExists([id])),
    ])

    let role
    let isAccessConfirmed = true

    if (userId) {
      const userShare = project.share?.find(share => share.user?.id === userId)
      const organisationMembership = project.organisation?.members?.find(
        member => member.user?.id === userId,
      )

      if (project.admin?.id === userId) {
        role = 'owner'
      } else if (userShare) {
        role = userShare.role
        isAccessConfirmed = userShare.confirmed
      } else if (organisationMembership) {
        role = organisationMembership.role
        isAccessConfirmed = organisationMembership.confirmed
      }
    }

    return {
      ..._omit(project, [
        'admin',
        'passwordHash',
        'organisation',
        role !== 'owner' && role !== 'admin' && 'share',
      ]),
      isAccessConfirmed,
      isLocked: !!project.admin?.dashboardBlockReason,
      isDataExists,
      isErrorDataExists,
      organisationId: project.organisation?.id,
      role,
    }
  }

  @ApiOperation({ summary: 'Get project view' })
  @ApiOkResponse({ type: ProjectViewEntity })
  @ApiBearerAuth()
  @Get(':projectId/views/:viewId')
  @Auth([], true, true)
  async getProjectView(
    @Param() params: ProjectViewIdsDto,
    @CurrentUserId() userId: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const project = await this.projectService.getFullProject(params.projectId)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    this.projectService.allowedToView(project, userId, headers['x-password'])

    return this.projectsViewsRepository.findProjectView(
      params.projectId,
      params.viewId,
    )
  }

  @ApiOperation({ summary: 'Create project view' })
  @ApiOkResponse({ type: ProjectViewEntity })
  @ApiBearerAuth()
  @Post(':projectId/views')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async createProjectView(
    @Param() params: ProjectIdDto,
    @Body() body: CreateProjectViewDto,
    @CurrentUserId() userId: string,
  ) {
    const project = await this.projectService.getFullProject(params.projectId)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    const user = await this.userService.findUserV2(userId, ['roles'])

    if (!user) {
      throw new NotFoundException('User not found.')
    }

    this.projectService.allowedToManage(project, userId, user.roles)

    const createdProjectView =
      await this.projectsViewsRepository.createProjectView(params.projectId, {
        type: body.type,
        customEvents: body.customEvents,
        name: body.name,
        filters: JSON.stringify(
          this.projectService.filterUnsupportedColumns(body.filters),
          null,
          2,
        ),
      })

    return _omit(createdProjectView, ['project'])
  }

  @ApiOperation({ summary: 'Get project views' })
  @ApiOkResponse({ type: ProjectViewEntity })
  @ApiBearerAuth()
  @Get(':projectId/views')
  @Auth([], true, true)
  async getProjectViews(
    @Param() params: ProjectIdDto,
    @CurrentUserId() userId: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const project = await this.projectService.getFullProject(params.projectId)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    this.projectService.allowedToView(project, userId, headers['x-password'])

    return this.projectsViewsRepository.findViews(params.projectId)
  }

  @ApiOperation({ summary: 'Update project view' })
  @ApiOkResponse({ type: ProjectViewEntity })
  @ApiBearerAuth()
  @Patch(':projectId/views/:viewId')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async updateProjectView(
    @Param() params: ProjectViewIdsDto,
    @Body() body: UpdateProjectViewDto,
    @CurrentUserId() userId: string,
  ) {
    const project = await this.projectService.getFullProject(params.projectId)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    const user = await this.userService.findUserV2(userId, ['roles'])

    if (!user) {
      throw new NotFoundException('User not found.')
    }

    this.projectService.allowedToManage(project, userId, user.roles)

    const view = await this.projectsViewsRepository.findProjectView(
      params.projectId,
      params.viewId,
    )

    if (!view) {
      throw new NotFoundException('View not found.')
    }

    await this.projectsViewsRepository.updateProjectView(params.viewId, {
      name: body.name,
      customEvents: body.customEvents,
      filters: JSON.stringify(
        this.projectService.filterUnsupportedColumns(body.filters),
        null,
        2,
      ),
    })

    return this.projectsViewsRepository.findView(params.viewId)
  }

  @ApiOperation({ summary: 'Delete project view' })
  @ApiNoContentResponse()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':projectId/views/:viewId')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async deleteProjectView(
    @Param() params: ProjectViewIdsDto,
    @CurrentUserId() userId: string,
  ) {
    const project = await this.projectService.getFullProject(params.projectId)

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    const user = await this.userService.findUserV2(userId, ['roles'])

    if (!user) {
      throw new NotFoundException('User not found')
    }

    this.projectService.allowedToManage(project, userId, user.roles)

    const view = await this.projectsViewsRepository.findProjectView(
      params.projectId,
      params.viewId,
    )

    if (!view) {
      throw new NotFoundException('View not found.')
    }

    await this.projectsViewsRepository.deleteProjectView(params.viewId)
  }

  @ApiOperation({ summary: 'Get monitors for a project' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: MonitorEntity })
  @Get(':projectId/monitors')
  @Auth([], true, true)
  public async getProjectMonitors(
    @Param() { projectId }: ProjectIdDto,
    @CurrentUserId() userId: string,
    @Query('take') take: number | undefined,
    @Query('skip') skip: number | undefined,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<Pagination<MonitorEntity>> {
    this.logger.log({ userId, take, skip }, 'GET /project/:projectId/monitors')

    const project = await this.projectService.getFullProject(projectId)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    this.projectService.allowedToView(project, userId, headers['x-password'])

    const result = await this.projectService.paginateMonitors(
      {
        take,
        skip,
      },
      { project: Equal(project.id) },
    )

    // @ts-expect-error
    result.results = _map(result.results, monitor => ({
      ..._omit(monitor, ['project']),
      projectId: monitor.project.id,
    }))

    return result
  }

  @ApiOperation({ summary: 'Create monitor for the project' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: MonitorEntity })
  @Post(':projectId/monitor')
  @Auth([], true, true)
  public async createMonitor(
    @Param() { projectId }: ProjectIdDto,
    @Body() body: CreateMonitorHttpRequestDTO,
    @CurrentUserId() userId: string,
  ): Promise<MonitorEntity> {
    const project = await this.projectService.getFullProject(projectId)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    const user = await this.userService.findUserV2(userId, ['roles'])

    if (!user) {
      throw new NotFoundException('User not found.')
    }

    this.projectService.allowedToManage(project, userId, user.roles)

    const monitor = await this.projectService.createMonitor(body, projectId)

    // Create a job in service for sending httpRequest
    await this.projectService.sendHttpRequest(monitor.id, {
      ...monitor,
      timeout: monitor.timeout * 1000,
    })

    return monitor
  }

  @ApiOperation({ summary: 'Get monitor for the project' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: MonitorEntity })
  @Get(':projectId/monitor/:monitorId')
  @Auth([], true, true)
  public async getMonitor(
    @Param() { projectId }: ProjectIdDto,
    @Param('monitorId') monitorId: number,
    @CurrentUserId() userId: string,
  ): Promise<MonitorEntity> {
    const project = await this.projectService.getFullProject(projectId)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    this.projectService.allowedToManage(project, userId)

    const monitor = await this.projectService.getMonitor(monitorId)

    if (!monitor) {
      throw new NotFoundException('Monitor not found.')
    }

    return monitor
  }

  @ApiOperation({ summary: 'Update monitor for the project' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: MonitorEntity })
  @Patch(':projectId/monitor/:monitorId')
  @Auth([], true, true)
  public async updateMonitor(
    @Param() { projectId }: ProjectIdDto,
    @Param('monitorId') monitorId: number,
    @Body() body: UpdateMonitorHttpRequestDTO,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    const project = await this.projectService.getFullProject(projectId)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    const user = await this.userService.findUserV2(userId, ['roles'])

    if (!user) {
      throw new NotFoundException('User not found.')
    }

    this.projectService.allowedToManage(project, userId, user.roles)

    const monitor = await this.projectService.getMonitor(monitorId)

    if (!monitor) {
      throw new NotFoundException('Monitor not found.')
    }

    const updatedMonitor = await this.projectService.updateMonitor(
      monitorId,
      body,
    )

    await this.projectService.updateHttpRequest(monitor.id, monitor)
    return updatedMonitor
  }

  @ApiOperation({ summary: 'Delete monitor from the project' })
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Monitor deleted successfully' })
  @Delete(':projectId/monitor/:monitorId')
  @Auth([], true, true)
  public async deleteMonitor(
    @Param() { projectId }: ProjectIdDto,
    @Param('monitorId') monitorId: number,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    const project = await this.projectService.getFullProject(projectId)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }
    const user = await this.userService.findUserV2(userId, ['roles'])

    if (!user) {
      throw new NotFoundException('User not found.')
    }

    this.projectService.allowedToManage(project, userId, user.roles)

    const monitor = await this.projectService.getMonitor(monitorId)

    if (!monitor) {
      throw new NotFoundException('Monitor not found.')
    }

    this.projectService.deleteMonitor(monitorId)
    this.projectService.deleteHttpRequest(monitorId)
  }
}
