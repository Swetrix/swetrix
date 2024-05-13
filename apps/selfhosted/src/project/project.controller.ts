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
  Headers,
  UnauthorizedException,
  Patch,
} from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import { ApiTags, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import * as _isEmpty from 'lodash/isEmpty'
import * as _map from 'lodash/map'
import * as _trim from 'lodash/trim'
import * as _size from 'lodash/size'
import * as _split from 'lodash/split'
import * as _isBoolean from 'lodash/isBoolean'
import * as _omit from 'lodash/omit'
import * as _reduce from 'lodash/reduce'
import * as _head from 'lodash/head'
import * as _includes from 'lodash/includes'
import * as dayjs from 'dayjs'
import { hash } from 'bcrypt'

import { JwtAccessTokenGuard } from '../auth/guards'
import { Auth } from '../auth/decorators'
import { isValidDate } from '../analytics/analytics.service'
import {
  ProjectService,
  deleteProjectRedis,
  generateProjectId,
} from './project.service'
import { UserType } from '../user/entities/user.entity'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Pagination } from '../common/pagination/pagination'
import { Project } from './entity/project.entity'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import {
  ProjectDTO,
  CreateProjectDTO,
  UpdateProjectDto,
  FunnelCreateDTO,
  FunnelUpdateDTO,
} from './dto'
import { AppLoggerService } from '../logger/logger.service'
import { isValidPID, clickhouse } from '../common/constants'
import {
  getProjectsClickhouse,
  createProjectClickhouse,
  updateProjectClickhouse,
  deleteProjectClickhouse,
  getFunnelsClickhouse,
  deleteFunnelClickhouse,
  createFunnelClickhouse,
  updateFunnelClickhouse,
} from '../common/utils'
import { Funnel } from './entity/funnel.entity'

@ApiTags('Project')
@Controller('project')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
  ) {}

  @Get('/')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'isCaptcha', required: false, type: Boolean })
  @ApiQuery({ name: 'relatedonly', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [Project] })
  @Auth([UserType.CUSTOMER, UserType.ADMIN], true)
  async get(
    @CurrentUserId() userId: string,
    @Query('take') take: number | undefined,
    @Query('skip') skip: number | undefined,
  ): Promise<Pagination<Project> | Project[] | object> {
    this.logger.log({ userId, take, skip }, 'GET /project')

    const chResults = await getProjectsClickhouse()
    const formatted = _map(chResults, this.projectService.formatFromClickhouse)

    const pidsWithData =
      await this.projectService.getPIDsWhereAnalyticsDataExists(
        _map(formatted, ({ id }) => id),
      )

    const pidsWithErrorData =
      await this.projectService.getPIDsWhereErrorsDataExists(
        _map(formatted, ({ id }) => id),
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
      (acc, { status, value }) => {
        if (status !== 'fulfilled') {
          return acc
        }

        return {
          ...acc,
          [value.pid]: this.projectService.formatFunnelFromClickhouse(
            value.data,
          ),
        }
      },
      {},
    )

    const results = _map(formatted, p => ({
      ..._omit(p, ['passwordHash']),
      funnels: funnelsMap[p.id],
      isOwner: true,
      isLocked: false,
      isDataExists: _includes(pidsWithData, p?.id),
      isErrorDataExists: _includes(pidsWithErrorData, p?.id),
    }))

    return {
      results,
      page_total: _size(formatted),
      total: _size(formatted),
      totalMonthlyEvents: 0, // not needed as it's selfhosed
    }
  }

  @Get('/names')
  @ApiResponse({ status: 200, type: [Project] })
  @Auth([UserType.CUSTOMER, UserType.ADMIN], true)
  async getNames(@CurrentUserId() userId: string): Promise<Project[]> {
    this.logger.log({ userId }, 'GET /project/names')

    const results = await getProjectsClickhouse()
    const formatted = _map(results, this.projectService.formatFromClickhouse)
    return formatted
  }

  @ApiBearerAuth()
  @Post('/')
  @ApiResponse({ status: 201, type: Project })
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async create(
    @Body() projectDTO: CreateProjectDTO,
    @CurrentUserId() userId: string,
  ): Promise<Project> {
    this.logger.log({ projectDTO, userId }, 'POST /project')

    const projects = await getProjectsClickhouse()

    this.projectService.validateProject(projectDTO as ProjectDTO, true)

    let pid = generateProjectId()

    while (!this.projectService.isPIDUnique(projects, pid)) {
      pid = generateProjectId()
    }

    const project = new Project()
    project.id = pid
    project.name = _trim(projectDTO.name)

    await createProjectClickhouse(project)

    return project
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

    const query1 = `ALTER table analytics DELETE WHERE pid='${id}'`
    const query2 = `ALTER table customEV DELETE WHERE pid='${id}'`

    try {
      await clickhouse.query(query1).toPromise()
      await clickhouse.query(query2).toPromise()
      return 'Project resetted successfully'
    } catch (e) {
      this.logger.error(e)
      return 'Error while resetting your project'
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

    const project = getProjectsClickhouse(funnelDTO.pid)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    const funnel = new Funnel()
    funnel.id = uuidv4()
    funnel.name = funnelDTO.name
    funnel.steps = _map(funnelDTO.steps, _trim)
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
  @Auth([], true)
  async updateFunnel(
    @Body() funnelDTO: FunnelUpdateDTO,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    this.logger.log({ funnelDTO, userId }, 'PATCH /project/funnel')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = getProjectsClickhouse(funnelDTO.pid)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    const oldFunnel = this.projectService.formatFunnelFromClickhouse(
      await getFunnelsClickhouse(funnelDTO.pid, funnelDTO.id),
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

    const oldFunnel = getFunnelsClickhouse(pid, id)

    if (!oldFunnel) {
      throw new NotFoundException('Funnel not found.')
    }

    await deleteFunnelClickhouse(id)
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

    const project = await getProjectsClickhouse(pid)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    this.projectService.allowedToView(project, userId, headers['x-password'])

    return getFunnelsClickhouse(pid)
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

    const project = await getProjectsClickhouse(projectId)

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

    // Checking if project exists
    getProjectsClickhouse(pid)

    from = dayjs(from).format('YYYY-MM-DD')
    to = dayjs(to).format('YYYY-MM-DD 23:59:59')

    await this.projectService.removeDataFromClickhouse(pid, from, to)
  }

  @ApiBearerAuth()
  @Delete('/:id')
  @HttpCode(204)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async delete(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    this.logger.log({ uid, id }, 'DELETE /project/:id')
    if (!isValidPID(id)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    await deleteProjectClickhouse(id)

    const query1 = `ALTER table analytics DELETE WHERE pid='${id}'`
    const query2 = `ALTER table customEV DELETE WHERE pid='${id}'`

    try {
      await clickhouse.query(query1).toPromise()
      await clickhouse.query(query2).toPromise()
      return 'Project deleted successfully'
    } catch (e) {
      this.logger.error(e)
      return 'Error while deleting your project'
    }
  }

  @ApiBearerAuth()
  @Put('/:id')
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 200, type: Project })
  async update(
    @Param('id') id: string,
    @Body() projectDTO: UpdateProjectDto,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    this.logger.log({ projectDTO, uid, id }, 'PUT /project/:id')
    this.projectService.validateProject(projectDTO)
    const project = await getProjectsClickhouse(id)

    if (_isEmpty(project)) {
      throw new NotFoundException()
    }

    if (_isBoolean(projectDTO.public)) {
      project.public = projectDTO.public
    }

    if (_isBoolean(projectDTO.active)) {
      project.active = projectDTO.active
    }

    if (projectDTO.origins) {
      project.origins = _map(projectDTO.origins, _trim)
    }

    if (projectDTO.ipBlacklist) {
      project.ipBlacklist = _map(projectDTO.ipBlacklist, _trim)
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

    // await updateProjectRedis(id, project)
    await deleteProjectRedis(id)

    return _omit(project, ['passwordHash'])
  }

  @Get('/:id')
  @Auth([], true, true)
  @ApiResponse({ status: 200, type: Project })
  async getOne(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
    @Headers() headers: { 'x-password'?: string },
  ): Promise<Project | object> {
    this.logger.log({ id }, 'GET /project/:id')
    if (!isValidPID(id)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    const project = await getProjectsClickhouse(id)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    if (project.isPasswordProtected && _isEmpty(headers['x-password'])) {
      return {
        isPasswordProtected: true,
        id: project.id,
      }
    }

    this.projectService.allowedToView(project, uid, headers['x-password'])

    const isDataExists = !_isEmpty(
      await this.projectService.getPIDsWhereAnalyticsDataExists([id]),
    )

    const isErrorDataExists = !_isEmpty(
      await this.projectService.getPIDsWhereErrorsDataExists([id]),
    )

    const funnels = await getFunnelsClickhouse(id)

    return this.projectService.formatFromClickhouse({
      ..._omit(project, ['passwordHash']),
      funnels: _map(funnels, this.projectService.formatFunnelFromClickhouse),
      isDataExists,
      isErrorDataExists,
    })
  }
}
