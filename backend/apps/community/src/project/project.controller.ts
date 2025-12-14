import {
  Controller,
  Body,
  Query,
  Param,
  Get,
  Post,
  Put,
  Delete,
  BadRequestException,
  HttpCode,
  NotFoundException,
  Headers,
  UnauthorizedException,
  Patch,
  HttpStatus,
  ParseIntPipe,
  ConflictException,
} from '@nestjs/common'
import { randomUUID } from 'crypto'
import {
  ApiTags,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _trim from 'lodash/trim'
import _size from 'lodash/size'
import _split from 'lodash/split'
import _isBoolean from 'lodash/isBoolean'
import _omit from 'lodash/omit'
import _find from 'lodash/find'
import _isNil from 'lodash/isNil'
import _reduce from 'lodash/reduce'
import _head from 'lodash/head'
import _includes from 'lodash/includes'
import dayjs from 'dayjs'
import { hash } from 'bcrypt'

import { Auth } from '../auth/decorators'
import { isValidDate } from '../analytics/analytics.service'
import {
  LEGAL_PID_CHARACTERS,
  PID_LENGTH,
  ProjectService,
  deleteProjectRedis,
} from './project.service'
import { Pagination } from '../common/pagination/pagination'
import { Project } from './entity/project.entity'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import {
  ProjectDTO,
  CreateProjectDTO,
  UpdateProjectDto,
  FunnelCreateDTO,
  FunnelUpdateDTO,
  TransferProjectBodyDto,
  AnnotationCreateDTO,
  AnnotationUpdateDTO,
} from './dto'
import { AppLoggerService } from '../logger/logger.service'
import { isValidPID } from '../common/constants'
import { clickhouse } from '../common/integrations/clickhouse'
import {
  getProjectsClickhouse,
  createProjectClickhouse,
  updateProjectClickhouse,
  deleteProjectClickhouse,
  getFunnelsClickhouse,
  deleteFunnelClickhouse,
  createFunnelClickhouse,
  updateFunnelClickhouse,
  findProjectViewClickhouse,
  deleteProjectViewClickhouse,
  createProjectViewClickhouse,
  findProjectViewsClickhouse,
  doesProjectViewExistClickhouse,
  updateProjectViewClickhouse,
  getFunnelClickhouse,
  generateRandomId,
  findProjectShareClickhouse,
  findProjectSharesByProjectClickhouse,
  findProjectSharesByUserClickhouse,
  findProjectShareByUserAndProjectClickhouse,
  createProjectShareClickhouse,
  updateProjectShareClickhouse,
  deleteProjectShareClickhouse,
  deleteProjectSharesByProjectClickhouse,
  ClickhouseProjectShare,
  getAnnotationsClickhouse,
  getAnnotationClickhouse,
  createAnnotationClickhouse,
  updateAnnotationClickhouse,
  deleteAnnotationClickhouse,
  getPinnedProjectsClickhouse,
  pinProjectClickhouse,
  unpinProjectClickhouse,
} from '../common/utils'
import { Funnel } from './entity/funnel.entity'
import { ProjectViewEntity } from './entity/project-view.entity'
import { ProjectViewIdsDto } from './dto/project-view-ids.dto'
import { ProjectIdDto } from './dto/project-id.dto'
import { CreateProjectViewDto } from './dto/create-project-view.dto'
import { UpdateProjectViewDto } from './dto/update-project-view.dto'
import { UserService } from '../user/user.service'
import { MailerService } from '../mailer/mailer.service'
import { LetterTemplate } from '../mailer/letter'

@ApiTags('Project')
@Controller(['project', 'v1/project'])
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
    private readonly userService: UserService,
    private readonly mailerService: MailerService,
  ) {}

  @Get('/')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
  })
  @ApiResponse({ status: 200, type: [Project] })
  @Auth(true)
  async get(
    @CurrentUserId() userId: string,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('search') search?: string,
    @Query('sort')
    sort?: 'alpha_asc' | 'alpha_desc' | 'date_asc' | 'date_desc',
  ): Promise<Pagination<Project> | Project[] | object> {
    this.logger.log({ userId, take, skip, sort }, 'GET /project')

    // 1) Load projects owned by the user
    const chResults = await getProjectsClickhouse(userId, search, sort)
    const ownedProjects = _map(
      chResults,
      this.projectService.formatFromClickhouse,
    )

    let sharesByProjectId: Record<string, any> = {}
    let sharedProjects: Project[] = []

    if (userId) {
      const rawShares = await findProjectSharesByUserClickhouse(userId, search)
      sharesByProjectId = (rawShares || []).reduce((acc: any, row: any) => {
        acc[row.projectId] = {
          id: row.id,
          role: row.role,
          confirmed: Boolean(row.confirmed),
        }
        return acc
      }, {})

      // 2) Build formatted "shared" projects (including unaccepted ones)
      sharedProjects = _map(rawShares, (row: any) =>
        this.projectService.formatFromClickhouse({
          id: row.projectId,
          name: row.projectName,
          origins: row.projectOrigins,
          ipBlacklist: row.projectIpBlacklist,
          countryBlacklist: row.projectCountryBlacklist,
          active: row.projectActive,
          public: row.projectPublic,
          isPasswordProtected: row.projectIsPasswordProtected,
          botsProtectionLevel: row.projectBotsProtectionLevel,
          created: row.projectCreated,
          // These fields are not needed for the dashboard list, set to null
          adminId: null,
          passwordHash: null,
        }),
      )
    }

    // 3) Combine owned and shared projects, remove duplicates (prefer owned)
    const combinedProjectsMap: Record<string, Project> = {}

    _map(ownedProjects, p => {
      combinedProjectsMap[p.id] = p
    })

    _map(sharedProjects, p => {
      if (!combinedProjectsMap[p.id]) {
        combinedProjectsMap[p.id] = p
      }
    })

    let combinedProjects = _map(combinedProjectsMap, p => p)

    if (sort) {
      combinedProjects = [...combinedProjects].sort((a: any, b: any) => {
        if (sort === 'alpha_asc') {
          return (a.name || '').localeCompare(b.name || '')
        }
        if (sort === 'alpha_desc') {
          return (b.name || '').localeCompare(a.name || '')
        }
        if (sort === 'date_asc') {
          return (a.created || '').localeCompare(b.created || '')
        }
        if (sort === 'date_desc') {
          return (b.created || '').localeCompare(a.created || '')
        }
        return 0
      })
    }

    const pidsWithData =
      await this.projectService.getPIDsWhereAnalyticsDataExists(
        _map(combinedProjects, ({ id }) => id),
      )

    const pidsWithErrorData =
      await this.projectService.getPIDsWhereErrorsDataExists(
        _map(combinedProjects, ({ id }) => id),
      )

    const funnelsData = await Promise.allSettled(
      pidsWithData.map(async pid => {
        return {
          pid,
          data: await getFunnelsClickhouse(pid),
        }
      }),
    )

    const funnelsMap = _reduce(
      funnelsData,
      // @ts-expect-error This one is super sus, take a look at this in future
      (acc, { status, value }) => {
        if (status !== 'fulfilled') {
          return acc
        }

        return {
          ...acc,
          [value.pid]: this.projectService.formatFunnelsFromClickhouse(
            value.data,
          ),
        }
      },
      {},
    )

    const results = _map(combinedProjects, project => {
      const userShare = sharesByProjectId[project.id]
      const isOwner = userId && project.adminId === userId
      const role = isOwner
        ? 'owner'
        : userShare
          ? userShare.role
          : userId
            ? 'viewer'
            : 'viewer'
      const isAccessConfirmed = isOwner
        ? true
        : userShare
          ? Boolean(userShare.confirmed)
          : true

      const projectShare = userShare
        ? [
            {
              id: userShare.id,
              role: userShare.role,
              confirmed: Boolean(userShare.confirmed),
              user: { id: userId },
            },
          ]
        : undefined

      return {
        ..._omit(project, ['passwordHash']),
        share: projectShare,
        funnels: funnelsMap[project.id],
        isDataExists: _includes(pidsWithData, project?.id),
        isErrorDataExists: _includes(pidsWithErrorData, project?.id),
        role,
        isLocked: false,
        isAccessConfirmed,
        isAnalyticsProject: true,
      }
    })

    // Get pinned projects
    const pinnedProjectIds = await getPinnedProjectsClickhouse(userId)

    // Add isPinned flag to results
    const resultsWithPinned = _map(results, project => ({
      ...project,
      isPinned: _includes(pinnedProjectIds, project?.id),
    }))

    // Sort pinned projects first
    resultsWithPinned.sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return 0
    })

    return {
      results: resultsWithPinned,
      page_total: _size(combinedProjects),
      total: _size(combinedProjects),
    }
  }

  @ApiBearerAuth()
  @Post('/:id/pin')
  @ApiOperation({ summary: 'Pin a project to the top of the dashboard' })
  @ApiResponse({ status: 200, description: 'Project pinned successfully' })
  @Auth(true)
  async pinProject(
    @Param('id') projectId: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    this.logger.log({ projectId, userId }, 'POST /project/:id/pin')

    if (!isValidPID(projectId)) {
      throw new BadRequestException('The provided project ID is incorrect')
    }

    const project = await this.projectService.getFullProject(projectId)

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    this.projectService.allowedToView(project, userId)

    await pinProjectClickhouse(userId, projectId)
  }

  @ApiBearerAuth()
  @Delete('/:id/pin')
  @ApiOperation({ summary: 'Unpin a project from the top of the dashboard' })
  @ApiResponse({ status: 200, description: 'Project unpinned successfully' })
  @Auth(true)
  async unpinProject(
    @Param('id') projectId: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    this.logger.log({ projectId, userId }, 'DELETE /project/:id/pin')

    if (!isValidPID(projectId)) {
      throw new BadRequestException('The provided project ID is incorrect')
    }

    await unpinProjectClickhouse(userId, projectId)
  }

  @Post('transfer')
  @Auth()
  async transferProject(
    @Body() body: TransferProjectBodyDto,
    @CurrentUserId() userId: string,
  ) {
    // On Swetrix Cloud we send an email to verify transfer, and then transfer when user clicks on the email link
    // Here we'll just transfer the project for now
    this.logger.log({ body }, 'POST /project/transfer')

    const project = await this.projectService.getOwnProject(
      body.projectId,
      userId,
    )

    const newAdmin = await this.userService.findOne({
      email: body.email,
    })

    if (_isEmpty(newAdmin)) {
      throw new NotFoundException('User not found.')
    }

    if (project.adminId === newAdmin.id) {
      throw new ConflictException('You cannot transfer project to yourself.')
    }

    await this.projectService.confirmTransferProject(
      body.projectId,
      newAdmin.id,
      project.adminId,
    )
  }

  @ApiBearerAuth()
  @Post('/:pid/share')
  @HttpCode(200)
  @Auth()
  async share(
    @Param('pid') pid: string,
    @Body() body: { email: string; role: 'admin' | 'viewer' },
    @CurrentUserId() userId: string,
  ) {
    this.logger.log({ userId, pid, body }, 'POST /project/:pid/share')

    if (!isValidPID(pid)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    if (!body?.email || !['admin', 'viewer'].includes(body.role)) {
      throw new BadRequestException('The provided share is incorrect')
    }

    const inviter = await this.userService.findOne({ id: userId })
    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    if (inviter.email === body.email) {
      throw new BadRequestException('You cannot share with yourself')
    }

    const invitee = await this.userService.findOne({ email: body.email })

    if (!invitee) {
      throw new BadRequestException(
        `User with email ${body.email} is not registered on Swetrix`,
      )
    }

    const existing = await findProjectShareByUserAndProjectClickhouse(
      invitee.id,
      pid,
    )

    if (existing) {
      throw new BadRequestException(
        `You're already sharing the project with ${invitee.email}`,
      )
    }

    if (project.adminId !== userId) {
      throw new BadRequestException(
        'You are not allowed to manage this project',
      )
    }

    const id = randomUUID()

    await this.mailerService.sendEmail(
      invitee.email,
      LetterTemplate.ProjectInvitation,
      {
        email: inviter.email,
        name: project.name,
        role: body.role,
      },
    )

    await createProjectShareClickhouse({
      id,
      userId: invitee.id,
      projectId: pid,
      role: body.role,
      confirmed: 0,
    })
    await deleteProjectRedis(pid)

    return {
      ...project,
    }
  }

  @ApiBearerAuth()
  @Put('/share/:shareId')
  @HttpCode(200)
  @Auth()
  async updateShare(
    @Param('shareId') shareId: string,
    @Body() body: { role: 'admin' | 'viewer' },
    @CurrentUserId() userId: string,
  ): Promise<ClickhouseProjectShare> {
    this.logger.log({ userId, shareId, body }, 'PUT /project/share/:shareId')

    if (!body?.role || !['admin', 'viewer'].includes(body.role)) {
      throw new BadRequestException('The provided ShareUpdateDTO is incorrect')
    }

    const share = await findProjectShareClickhouse(shareId)

    if (!share) {
      throw new BadRequestException(`Share with ID ${shareId} does not exist`)
    }

    const project = await this.projectService.getFullProject(share.projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    await updateProjectShareClickhouse(shareId, { role: body.role })
    await deleteProjectRedis(share.projectId)

    return await findProjectShareClickhouse(shareId)
  }

  @ApiBearerAuth()
  @Post('/')
  @ApiResponse({ status: 201, type: Project })
  @Auth(true)
  async create(
    @Body() projectDTO: CreateProjectDTO,
    @CurrentUserId() userId: string,
  ): Promise<Project> {
    this.logger.log({ projectDTO, userId }, 'POST /project')

    const projects = await getProjectsClickhouse(userId)

    this.projectService.validateProject(projectDTO as ProjectDTO, true)

    let pid = generateRandomId(LEGAL_PID_CHARACTERS, PID_LENGTH)

    while (!this.projectService.isPIDUnique(projects, pid)) {
      pid = generateRandomId(LEGAL_PID_CHARACTERS, PID_LENGTH)
    }

    const project = new Project()
    project.id = pid
    project.name = _trim(projectDTO.name)

    await createProjectClickhouse({ ...project, adminId: userId })

    return project
  }

  @ApiBearerAuth()
  @Delete('/reset/:id')
  @HttpCode(204)
  @Auth(true)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async reset(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ): Promise<any> {
    this.logger.log({ userId, id }, 'DELETE /project/reset/:id')
    if (!isValidPID(id)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const project = await this.projectService.getOwnProject(id, userId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    try {
      await clickhouse.command({
        query: `ALTER TABLE analytics DELETE WHERE pid='${id}'`,
      })
      await clickhouse.command({
        query: `ALTER TABLE customEV DELETE WHERE pid='${id}'`,
      })
      return 'Project reset successfully'
    } catch (e) {
      this.logger.error(e)
      return 'Error while resetting your project'
    }
  }

  @Post('/funnel')
  @ApiResponse({ status: 201 })
  @Auth(true)
  async createFunnel(
    @Body() funnelDTO: FunnelCreateDTO,
    @CurrentUserId() userId: string,
  ): Promise<any> {
    this.logger.log({ funnelDTO, userId }, 'POST /project/funnel')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(funnelDTO.pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    const funnel = new Funnel()
    funnel.id = randomUUID()
    funnel.name = funnelDTO.name
    funnel.steps = _map(funnelDTO.steps, _trim) as string[]
    funnel.projectId = funnelDTO.pid

    const formatted = this.projectService.formatFunnelToClickhouse(funnel)

    await createFunnelClickhouse(formatted)

    return {
      ...funnel,
      pid: funnelDTO.pid,
      project: _omit(this.projectService.formatFromClickhouse(project), [
        'passwordHash',
      ]),
    }
  }

  @Patch('/funnel')
  @ApiResponse({ status: 200 })
  @Auth(true)
  async updateFunnel(
    @Body() funnelDTO: FunnelUpdateDTO,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    this.logger.log({ funnelDTO, userId }, 'PATCH /project/funnel')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(funnelDTO.pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    const oldFunnel = this.projectService.formatFunnelFromClickhouse(
      await getFunnelClickhouse(funnelDTO.pid, funnelDTO.id),
    )

    if (!oldFunnel) {
      throw new NotFoundException('Funnel not found.')
    }

    await updateFunnelClickhouse(
      this.projectService.formatFunnelToClickhouse({
        id: funnelDTO.id,
        name: funnelDTO.name,
        steps: funnelDTO.steps,
      } as Funnel),
    )
  }

  @Delete('/funnel/:id/:pid')
  @ApiResponse({ status: 200 })
  @Auth(true)
  async deleteFunnel(
    @Param('id') id: string,
    @Param('pid') pid: string,
    @CurrentUserId() userId: string,
  ) {
    this.logger.log({ id, userId }, 'PATCH /project/funnel')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    const oldFunnel = await getFunnelClickhouse(pid, id)

    if (!oldFunnel) {
      throw new NotFoundException('Funnel not found.')
    }

    await deleteFunnelClickhouse(id)
  }

  @Get('/funnels/:pid')
  @ApiResponse({ status: 200 })
  @Auth(true)
  async getFunnels(
    @Param('pid') pid: string,
    @CurrentUserId() userId: string,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<any> {
    this.logger.log({ pid, userId }, 'PATCH /project/funnel')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToView(project, userId, headers['x-password'])

    return this.projectService.formatFunnelsFromClickhouse(
      await getFunnelsClickhouse(pid),
    )
  }

  @Post('/annotation')
  @ApiResponse({ status: 201 })
  @Auth(true)
  async createAnnotation(
    @Body() annotationDTO: AnnotationCreateDTO,
    @CurrentUserId() userId: string,
  ): Promise<any> {
    this.logger.log({ annotationDTO, userId }, 'POST /project/annotation')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(annotationDTO.pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    const annotation = {
      id: randomUUID(),
      date: annotationDTO.date,
      text: annotationDTO.text,
      projectId: annotationDTO.pid,
    }

    await createAnnotationClickhouse(annotation)

    return annotation
  }

  @Patch('/annotation')
  @ApiResponse({ status: 200 })
  @Auth(true)
  async updateAnnotation(
    @Body() annotationDTO: AnnotationUpdateDTO,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    this.logger.log({ annotationDTO, userId }, 'PATCH /project/annotation')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(annotationDTO.pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    const oldAnnotation = await getAnnotationClickhouse(
      annotationDTO.pid,
      annotationDTO.id,
    )

    if (!oldAnnotation) {
      throw new NotFoundException('Annotation not found.')
    }

    await updateAnnotationClickhouse({
      id: annotationDTO.id,
      date: annotationDTO.date,
      text: annotationDTO.text,
    })
  }

  @Delete('/annotation/:id/:pid')
  @ApiResponse({ status: 200 })
  @Auth(true)
  async deleteAnnotation(
    @Param('id') id: string,
    @Param('pid') pid: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    this.logger.log({ id, userId }, 'DELETE /project/annotation')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    const oldAnnotation = await getAnnotationClickhouse(pid, id)

    if (!oldAnnotation) {
      throw new NotFoundException('Annotation not found.')
    }

    await deleteAnnotationClickhouse(id)
  }

  @Get('/annotations/:pid')
  @ApiResponse({ status: 200 })
  @Auth(true)
  async getAnnotations(
    @Param('pid') pid: string,
    @CurrentUserId() userId: string,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<any> {
    this.logger.log({ pid, userId }, 'GET /project/annotations')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToView(project, userId, headers['x-password'])

    return getAnnotationsClickhouse(pid)
  }

  @Get('password/:projectId')
  @Auth(true, true)
  @ApiResponse({ status: 200, type: Project })
  async checkPassword(
    @Param('projectId') projectId: string,
    @CurrentUserId() userId: string,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<boolean> {
    this.logger.log({ projectId }, 'GET /project/password/:projectId')

    const project = await this.projectService.getFullProject(projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    try {
      this.projectService.allowedToView(project, userId, headers['x-password'])
    } catch {
      return false
    }

    return true
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
  @Auth()
  @Auth(true)
  async deletePartially(
    @Param('pid') pid: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUserId() userId: string,
  ) {
    this.logger.log({ from, to, pid, userId }, 'DELETE /partially/:id')

    if (!isValidPID(pid)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    from = _head(_split(from, 'T'))
    to = _head(_split(to, 'T'))

    if (!isValidDate(from)) {
      throw new BadRequestException("The provided 'from' date is incorrect")
    }

    if (!isValidDate(to)) {
      throw new BadRequestException("The provided 'to' date is incorrect")
    }

    from = dayjs(from).format('YYYY-MM-DD')
    to = dayjs(to).format('YYYY-MM-DD 23:59:59')

    await this.projectService.removeDataFromClickhouse(pid, from, to)
  }

  @Delete('/:id')
  @HttpCode(204)
  @Auth(true)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async delete(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ): Promise<any> {
    this.logger.log({ userId, id }, 'DELETE /project/:id')
    if (!isValidPID(id)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const project = await this.projectService.getOwnProject(id, userId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    await deleteProjectClickhouse(id)

    try {
      await deleteProjectSharesByProjectClickhouse(id)
      await clickhouse.command({
        query: `ALTER TABLE analytics DELETE WHERE pid='${id}'`,
      })
      await clickhouse.command({
        query: `ALTER TABLE customEV DELETE WHERE pid='${id}'`,
      })
      await deleteProjectRedis(id)
      return 'Project deleted successfully'
    } catch (e) {
      this.logger.error(e)
      return 'Error while deleting your project'
    }
  }

  @Put('/:id')
  @HttpCode(200)
  @Auth(true)
  @ApiResponse({ status: 200, type: Project })
  async update(
    @Param('id') id: string,
    @Body() projectDTO: UpdateProjectDto,
    @CurrentUserId() userId: string,
  ): Promise<any> {
    this.logger.log({ projectDTO, userId, id }, 'PUT /project/:id')
    this.projectService.validateProject(projectDTO)

    const project = await this.projectService.getFullProject(id)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    if (_isBoolean(projectDTO.public)) {
      project.public = projectDTO.public
    }

    if (_isBoolean(projectDTO.active)) {
      project.active = projectDTO.active
    }

    if (projectDTO.origins) {
      project.origins = _map(projectDTO.origins, _trim) as string[]
    } else {
      project.origins = []
    }

    if (projectDTO.ipBlacklist) {
      project.ipBlacklist = _map(projectDTO.ipBlacklist, _trim) as string[]
    } else {
      project.ipBlacklist = []
    }

    if (projectDTO.countryBlacklist) {
      project.countryBlacklist = _map(
        projectDTO.countryBlacklist,
        _trim,
      ) as string[]
    } else {
      project.countryBlacklist = []
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

    await updateProjectClickhouse(
      this.projectService.formatToClickhouse(project),
    )

    await deleteProjectRedis(id)

    return _omit(project, ['passwordHash'])
  }

  @Get('/:id')
  @Auth(true, true)
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

    const project = await this.projectService.getFullProject(id)

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

    const isDataExists = !_isEmpty(
      await this.projectService.getPIDsWhereAnalyticsDataExists([id]),
    )

    const isErrorDataExists = !_isEmpty(
      await this.projectService.getPIDsWhereErrorsDataExists([id]),
    )

    const funnels = await getFunnelsClickhouse(id)
    const rawShares = await findProjectSharesByProjectClickhouse(id)

    const share = (rawShares || []).map((row: any) => ({
      id: row.id,
      role: row.role,
      confirmed: Boolean(row.confirmed),
      created: row.created,
      updated: row.updated,
      user: {
        id: row.userId,
        email: row.email,
      },
    }))

    const isOwner = userId && project.adminId === userId
    const userShare = (rawShares || []).find(
      (row: any) => row.userId === userId,
    )
    const role = isOwner
      ? 'owner'
      : userShare
        ? userShare.role
        : userId
          ? 'viewer'
          : 'viewer'
    const isAccessConfirmed = isOwner
      ? true
      : userShare
        ? Boolean(userShare.confirmed)
        : true

    return this.projectService.formatFromClickhouse({
      ..._omit(project, ['passwordHash']),
      share,
      funnels: this.projectService.formatFunnelsFromClickhouse(funnels),
      isDataExists,
      isErrorDataExists,
      role,
      isLocked: false,
      isAccessConfirmed,
      isAnalyticsProject: true,
    })
  }

  @ApiOperation({ summary: 'Get project view' })
  @ApiOkResponse({ type: ProjectViewEntity })
  @ApiBearerAuth()
  @Get(':projectId/views/:viewId')
  @Auth(true, true)
  async getProjectView(
    @Param() params: ProjectViewIdsDto,
    @CurrentUserId() userId: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const project = await this.projectService.getFullProject(params.projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToView(project, userId, headers['x-password'])

    return findProjectViewClickhouse(params.projectId, params.viewId)
  }

  @ApiOperation({ summary: 'Create project view' })
  @ApiOkResponse({ type: ProjectViewEntity })
  @ApiBearerAuth()
  @Post(':projectId/views')
  @Auth(true)
  async createProjectView(
    @Param() params: ProjectIdDto,
    @Body() body: CreateProjectViewDto,
    @CurrentUserId() userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(params.projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    const viewId = randomUUID()

    const { customEvents } = body

    if (!_isEmpty(customEvents)) {
      for (let i = 0; i < _size(customEvents); ++i) {
        const customEvent = customEvents[i]

        customEvents[i] = {
          ...customEvent,
          // @ts-expect-error
          id: randomUUID(),
        }
      }
    }

    await createProjectViewClickhouse(
      // @ts-expect-error
      this.projectService.formatViewToClickhouse({
        ...body,
        customEvents,
        id: viewId,
        projectId: params.projectId,
      }),
    )

    const view = await findProjectViewClickhouse(viewId, params.projectId)

    return this.projectService.formatViewFromClickhouse(view)
  }

  @ApiOperation({ summary: 'Get project views' })
  @ApiOkResponse({ type: ProjectViewEntity })
  @ApiBearerAuth()
  @Get(':projectId/views')
  @Auth(true, true)
  async getProjectViews(
    @Param() params: ProjectIdDto,
    @CurrentUserId() userId: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const project = await this.projectService.getFullProject(params.projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToView(project, userId, headers['x-password'])

    const views = await findProjectViewsClickhouse(params.projectId)

    return this.projectService.formatViewsFromClickhouse(views)
  }

  @ApiOperation({ summary: 'Update project view' })
  @ApiOkResponse({ type: ProjectViewEntity })
  @ApiBearerAuth()
  @Patch(':projectId/views/:viewId')
  @Auth(true)
  async updateProjectView(
    @Param() params: ProjectViewIdsDto,
    @Body() body: UpdateProjectViewDto,
    @CurrentUserId() userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(params.projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    const viewExists = await doesProjectViewExistClickhouse(
      params.projectId,
      params.viewId,
    )

    if (!viewExists) {
      throw new NotFoundException('View not found.')
    }

    await updateProjectViewClickhouse(
      params.viewId,
      // @ts-expect-error
      this.projectService.formatViewToClickhouse({
        ...body,
        id: params.viewId,
        projectId: params.projectId,
      }),
    )

    const view = await findProjectViewClickhouse(
      params.viewId,
      params.projectId,
    )

    return this.projectService.formatViewFromClickhouse(view)
  }

  @ApiBearerAuth()
  @Delete('/:pid/:shareId')
  @HttpCode(204)
  @Auth()
  async deleteShare(
    @Param('pid') pid: string,
    @Param('shareId') shareId: string,
    @CurrentUserId() userId: string,
  ) {
    this.logger.log({ userId, pid, shareId }, 'DELETE /project/:pid/:shareId')

    if (!isValidPID(pid)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const share = await findProjectShareClickhouse(shareId)

    if (!share) {
      return
    }

    const project = await this.projectService.getFullProject(pid)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    await deleteProjectShareClickhouse(shareId)
    await deleteProjectRedis(pid)
  }

  @ApiOperation({ summary: 'Delete project view' })
  @ApiNoContentResponse()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':projectId/views/:viewId')
  @Auth(true)
  async deleteProjectView(
    @Param() params: ProjectViewIdsDto,
    @CurrentUserId() userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await this.projectService.getFullProject(params.projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToManage(project, userId)

    const viewExists = await doesProjectViewExistClickhouse(
      params.projectId,
      params.viewId,
    )

    if (!viewExists) {
      throw new NotFoundException('View not found.')
    }

    await deleteProjectViewClickhouse(params.viewId)
  }
}
