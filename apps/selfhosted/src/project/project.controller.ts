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
} from '@nestjs/common'
import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger'
import * as _isEmpty from 'lodash/isEmpty'
import * as _map from 'lodash/map'
import * as _trim from 'lodash/trim'
import * as _size from 'lodash/size'
import * as _split from 'lodash/split'
import * as _head from 'lodash/head'
import * as dayjs from 'dayjs'

import { JwtAccessTokenGuard } from '../auth/guards'
import { Auth } from '../auth/decorators'
import { isValidDate } from '../analytics/analytics.service'
import {
  ProjectService, deleteProjectRedis, generateProjectId,
} from './project.service'
import { UserType } from '../user/entities/user.entity'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Pagination } from '../common/pagination/pagination'
import { Project } from './entity/project.entity'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import {
  ProjectDTO, CreateProjectDTO,
} from './dto'
import { AppLoggerService } from '../logger/logger.service'
import { isValidPID, clickhouse } from '../common/constants'
import {
  getProjectsClickhouse,
  createProjectClickhouse,
  updateProjectClickhouse,
  deleteProjectClickhouse,
} from '../common/utils'

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

    const results = await getProjectsClickhouse()
    const formatted = _map(results, this.projectService.formatFromClickhouse)
    return {
      results: formatted,
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

    this.projectService.validateProject(projectDTO)

    let pid = generateProjectId()

    while (!(this.projectService.isPIDUnique(projects, pid))) {
      pid = generateProjectId()
    }

    const project = new Project()
    project.id = pid
    projectDTO.name = _trim(projectDTO.name)

    await createProjectClickhouse(project)

    return project
  }

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

  @Put('/:id')
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 200, type: Project })
  async update(
    @Param('id') id: string,
    @Body() projectDTO: ProjectDTO,
    @CurrentUserId() uid: string,
  ): Promise<any> {
    this.logger.log({ projectDTO, uid, id }, 'PUT /project/:id')
    this.projectService.validateProject(projectDTO)
    const project = await getProjectsClickhouse(id)

    if (_isEmpty(project)) {
      throw new NotFoundException()
    }

    project.active = projectDTO.active
    project.origins = _map(projectDTO.origins, _trim)
    project.ipBlacklist = _map(projectDTO.ipBlacklist, _trim)
    project.name = projectDTO.name
    project.public = projectDTO.public

    await updateProjectClickhouse(
      this.projectService.formatToClickhouse(project),
    )

    // await updateProjectRedis(id, project)
    await deleteProjectRedis(id)

    return project
  }

  @Get('/:id')
  @Auth([], true, true)
  @ApiResponse({ status: 200, type: Project })
  async getOne(
    @Param('id') id: string,
    @CurrentUserId() uid: string,
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

    this.projectService.allowedToView(project, uid)

    return this.projectService.formatFromClickhouse(project)
  }
}
