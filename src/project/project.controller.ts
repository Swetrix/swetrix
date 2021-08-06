import {
  Controller, Body, Query, Param, UseGuards, Get, Post, Put, Delete,
  BadRequestException, HttpCode, NotFoundException, ForbiddenException,
} from '@nestjs/common'
import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger'
import * as _isEmpty from 'lodash/isEmpty'
import * as _map from 'lodash/map'
import * as _trim from 'lodash/trim'

import { ProjectService } from './project.service'
import { UserType } from '../user/entities/user.entity'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { Pagination } from '../common/pagination/pagination'
import { Project } from './entity/project.entity'
import { CurrentUserId } from '../common/decorators/current-user-id.decorator'
import { UserService } from '../user/user.service'
import { ProjectDTO } from './dto/project.dto'
import { AppLoggerService } from '../logger/logger.service'
import {
  redis, isValidPID, getRedisProjectKey, redisProjectCacheTimeout,
} from '../common/constants'

@ApiTags('Project')
@Controller('project')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly userService: UserService,
    private readonly logger: AppLoggerService,
  ) {}

  @Get('/')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'relatedonly', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [Project] })
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async get(@CurrentUserId() userId: string, @Query('take') take: number | undefined, @Query('skip') skip: number | undefined): Promise<Pagination<Project> | Project[]> {
    this.logger.log({ userId, take, skip }, 'GET /project')
    // const user = await this.userService.findOne(userId)
    const where = Object()

    where.admin = userId

    return await this.projectService.paginate({ take, skip }, where)
  }

  @Get('/:id')
  @ApiResponse({ status: 200, type: Project })
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async getOne(@Param('id') id: string): Promise<Project> {
    this.logger.log({ id }, 'GET /project/:id')
    if (!isValidPID(id)) throw new BadRequestException('The provided Project ID (pid) is incorrect')
    const project = await this.projectService.findOne(id)

    if (_isEmpty(project)) throw new NotFoundException()
    return project
  }

  @Post('/')
  @ApiResponse({ status: 201, type: Project })
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async create(@Body() projectDTO: ProjectDTO, @CurrentUserId() userId: string): Promise<Project> {
    this.logger.log({ projectDTO, userId }, 'POST /project')
    const user = await this.userService.findOneWithRelations(userId, ['projects'])

    if (!user.isActive) {
      throw new ForbiddenException('Please, verify your email address first')
    }

    this.projectService.validateProject(projectDTO)

    await this.projectService.checkIfIDUnique(projectDTO.id)

    try {
      const project = new Project()
      Object.assign(project, projectDTO)
      project.origins = _map(projectDTO.origins, _trim)

      const newProject = await this.projectService.create(project)
      user.projects.push(project)

      await this.userService.create(user)

      return newProject
    } catch(e) {
      if (e.code === 'ER_DUP_ENTRY'){
        if (e.sqlMessage.includes(projectDTO.id)){
          throw new BadRequestException('Project with selected ID already exists')
        }
      }

      throw new BadRequestException(e)
    }
  }

  @Put('/:id')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 200, type: Project })
  async update(@Param('id') id: string, @Body() projectDTO: ProjectDTO, @CurrentUserId() userId: string): Promise<any> {
    this.logger.log({ projectDTO, userId, id }, 'PUT /project/:id')
    this.projectService.validateProject(projectDTO)

    let project = await this.projectService.findOneWithRelations(id)

    if (_isEmpty(project)) {
      throw new NotFoundException()
    }

    project.active = projectDTO.active
    project.origins = _map(projectDTO.origins, _trim)
    project.name = projectDTO.name

    await this.projectService.allowedToManage(project, userId)
    await this.projectService.update(id, project)

    project = await this.projectService.findOne(id)

    try {
      await redis.set(getRedisProjectKey(id), JSON.stringify(project), 'EX', redisProjectCacheTimeout)
    } catch {
      await redis.del()
    }

    return project
  }

  @Delete('/:id')
  @HttpCode(204)
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async delete(@Param('id') id: string, @CurrentUserId() userId: string): Promise<any> {
    this.logger.log({ userId, id }, 'DELETE /project/:id')
    if (!isValidPID(id)) throw new BadRequestException('The provided Project ID (pid) is incorrect')

    const project = await this.projectService.findOneWithRelations(id)

    if (_isEmpty(project)) {
      throw new NotFoundException(`Project with ID ${id} does not exist`)
    }
    await this.projectService.allowedToManage(project, userId)

    try {
      await this.projectService.delete(id)
      return 'Project deleted successfully'
    } catch(e) {
      return e
    }
  }
}
