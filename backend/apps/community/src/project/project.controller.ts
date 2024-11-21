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
  HttpStatus,
} from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
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
import _reduce from 'lodash/reduce'
import _head from 'lodash/head'
import _includes from 'lodash/includes'
import dayjs from 'dayjs'
import { hash } from 'bcrypt'

import { JwtAccessTokenGuard } from '../auth/guards'
import { Auth } from '../auth/decorators'
import { isValidDate } from '../analytics/analytics.service'
import {
  ProjectService,
  deleteProjectRedis,
  generateProjectId,
} from './project.service'
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
  getProjectClickhouse,
  getFunnelClickhouse,
} from '../common/utils'
import { Funnel } from './entity/funnel.entity'
import { ProjectViewEntity } from './entity/project-view.entity'
import { ProjectViewIdsDto } from './dto/project-view-ids.dto'
import { ProjectIdDto } from './dto/project-id.dto'
import { CreateProjectViewDto } from './dto/create-project-view.dto'
import { UpdateProjectViewDto } from './dto/update-project-view.dto'

@ApiTags('Project')
@Controller(['project', 'v1/project'])
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly logger: AppLoggerService,
  ) {}

  @Get('/')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, type: [Project] })
  @Auth([], true)
  async get(
    @CurrentUserId() userId: string,
    @Query('take') take: number | undefined,
    @Query('skip') skip: number | undefined,
    @Query('search') search: string | undefined,
  ): Promise<Pagination<Project> | Project[] | object> {
    this.logger.log({ userId, take, skip }, 'GET /project')

    const chResults = await getProjectsClickhouse(search)
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
  @Auth([], true)
  async getNames(@CurrentUserId() userId: string): Promise<Project[]> {
    this.logger.log({ userId }, 'GET /project/names')

    const results = await getProjectsClickhouse()
    const formatted = _map(results, this.projectService.formatFromClickhouse)
    return formatted
  }

  @ApiBearerAuth()
  @Post('/')
  @ApiResponse({ status: 201, type: Project })
  @Auth([], true)
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
  @Auth([], true)
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

    try {
      await clickhouse.command({
        query: `DELETE FROM analytics WHERE pid='${id}'`,
      })
      await clickhouse.command({
        query: `DELETE FROM customEV WHERE pid='${id}'`,
      })
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

    const project = getProjectClickhouse(funnelDTO.pid)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    const funnel = new Funnel()
    funnel.id = uuidv4()
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
  @Auth([], true)
  async updateFunnel(
    @Body() funnelDTO: FunnelUpdateDTO,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    this.logger.log({ funnelDTO, userId }, 'PATCH /project/funnel')

    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = getProjectClickhouse(funnelDTO.pid)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

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

    const oldFunnel = getFunnelClickhouse(pid, id)

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

    const project = await getProjectClickhouse(pid)

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    this.projectService.allowedToView(project, userId, headers['x-password'])

    return this.projectService.formatFunnelsFromClickhouse(
      await getFunnelsClickhouse(pid),
    )
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

    const project = await getProjectClickhouse(projectId)

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
  @Auth([], true)
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
    getProjectClickhouse(pid)

    from = dayjs(from).format('YYYY-MM-DD')
    to = dayjs(to).format('YYYY-MM-DD 23:59:59')

    await this.projectService.removeDataFromClickhouse(pid, from, to)
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
    if (!isValidPID(id)) {
      throw new BadRequestException(
        'The provided Project ID (pid) is incorrect',
      )
    }

    await deleteProjectClickhouse(id)

    try {
      await clickhouse.command({
        query: `DELETE FROM analytics WHERE pid='${id}'`,
      })
      await clickhouse.command({
        query: `DELETE FROM customEV WHERE pid='${id}'`,
      })
      return 'Project deleted successfully'
    } catch (e) {
      this.logger.error(e)
      return 'Error while deleting your project'
    }
  }

  @Put('/:id')
  @HttpCode(200)
  @Auth([], true)
  @ApiResponse({ status: 200, type: Project })
  async update(
    @Param('id') id: string,
    @Body() projectDTO: UpdateProjectDto,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    this.logger.log({ projectDTO, uid, id }, 'PUT /project/:id')
    this.projectService.validateProject(projectDTO)
    const project = await getProjectClickhouse(id)

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
      project.origins = _map(projectDTO.origins, _trim) as string[]
    } else {
      project.origins = []
    }

    if (projectDTO.ipBlacklist) {
      project.ipBlacklist = _map(projectDTO.ipBlacklist, _trim) as string[]
    } else {
      project.ipBlacklist = []
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

    const project = await getProjectClickhouse(id)

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
      funnels: this.projectService.formatFunnelsFromClickhouse(funnels),
      isDataExists,
      isErrorDataExists,
    })
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
    const project = await getProjectClickhouse(params.projectId)

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
  @Auth([], true)
  async createProjectView(
    @Param() params: ProjectIdDto,
    @Body() body: CreateProjectViewDto,
    @CurrentUserId() userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

    const project = await getProjectClickhouse(params.projectId)

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    const viewId = uuidv4()

    const { customEvents } = body

    if (!_isEmpty(customEvents)) {
      for (let i = 0; i < _size(customEvents); ++i) {
        const customEvent = customEvents[i]

        customEvents[i] = {
          ...customEvent,
          // @ts-expect-error
          id: uuidv4(),
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
  @Auth([], true, true)
  async getProjectViews(
    @Param() params: ProjectIdDto,
    @CurrentUserId() userId: string,
    @Headers() headers: { 'x-password'?: string },
  ) {
    const project = await getProjectClickhouse(params.projectId)

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
  @Auth([], true)
  async updateProjectView(
    @Param() params: ProjectViewIdsDto,
    @Body() body: UpdateProjectViewDto,
    @CurrentUserId() userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

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

  @ApiOperation({ summary: 'Delete project view' })
  @ApiNoContentResponse()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':projectId/views/:viewId')
  @Auth([], true)
  async deleteProjectView(
    @Param() params: ProjectViewIdsDto,
    @CurrentUserId() userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Please auth first')
    }

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
