import {
  Controller, Body, Query, Param, UseGuards, Get, Post, Put, Delete,
  BadRequestException, HttpCode, NotFoundException, ForbiddenException,
} from '@nestjs/common'
import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger'
import * as _isEmpty from 'lodash/isEmpty'
import * as _map from 'lodash/map'
import * as _trim from 'lodash/trim'
import * as _size from 'lodash/size'

import { ProjectService } from './project.service'
import { UserType, ACCOUNT_PLANS } from '../user/entities/user.entity'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { Pagination } from '../common/pagination/pagination'
import { Project } from './entity/project.entity'
import { CurrentUserId } from '../common/decorators/current-user-id.decorator'
import { UserService } from '../user/user.service'
import { ProjectDTO } from './dto/project.dto'
import { AppLoggerService } from '../logger/logger.service'
import {
  redis, isValidPID, getRedisProjectKey, redisProjectCacheTimeout, clickhouse,
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
  async get(@CurrentUserId() uid: string, @Query('take') take: number | undefined, @Query('skip') skip: number | undefined): Promise<Pagination<Project> | Project[]> {
    this.logger.log({ uid, take, skip }, 'GET /project')
    const where = Object()
    where.admin = uid

    return await this.projectService.paginate({ take, skip }, where)
  }

  @Get('/:id')
  @ApiResponse({ status: 200, type: Project })
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async getOne(@Param('id') id: string, @CurrentUserId() uid: string): Promise<Project> {
    this.logger.log({ id }, 'GET /project/:id')
    if (!isValidPID(id)) throw new BadRequestException('The provided Project ID (pid) is incorrect')

    const project = await this.projectService.findOne(id)
    if (_isEmpty(project)) throw new NotFoundException('Project was not found in the database')

    this.projectService.allowedToView(project, uid)

    return project
  }

  @Post('/')
  @ApiResponse({ status: 201, type: Project })
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async create(@Body() projectDTO: ProjectDTO, @CurrentUserId() uid: string): Promise<Project> {
    this.logger.log({ projectDTO, uid }, 'POST /project')
    const user = await this.userService.findOneWithRelations(uid, ['projects'])
    const maxProjects = ACCOUNT_PLANS[user.planCode].maxProjects

    if (!user.isActive) {
      throw new ForbiddenException('Please, verify your email address first')
    }

    if (_size(user.projects) >= (maxProjects || 5)) {
      throw new ForbiddenException(`You cannot create more than ${maxProjects} projects on your account plan. Please upgrade to be able to create more projects.`)
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
  async update(@Param('id') id: string, @Body() projectDTO: ProjectDTO, @CurrentUserId() uid: string): Promise<any> {
    this.logger.log({ projectDTO, uid, id }, 'PUT /project/:id')
    this.projectService.validateProject(projectDTO)

    const project = await this.projectService.findOneWithRelations(id)

    if (_isEmpty(project)) {
      throw new NotFoundException()
    }
    this.projectService.allowedToManage(project, uid)

    project.active = projectDTO.active
    project.origins = _map(projectDTO.origins, _trim)
    project.name = projectDTO.name
    project.public = projectDTO.public

    await this.projectService.update(id, project)

    const key = getRedisProjectKey(id)

    try {
      await redis.set(key, JSON.stringify(project), 'EX', redisProjectCacheTimeout)
    } catch {
      await redis.del(key)
    }

    return project
  }

  @Delete('/:id')
  @HttpCode(204)
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async delete(@Param('id') id: string, @CurrentUserId() uid: string): Promise<any> {
    this.logger.log({ uid, id }, 'DELETE /project/:id')
    if (!isValidPID(id)) throw new BadRequestException('The provided Project ID (pid) is incorrect')

    const project = await this.projectService.findOneWhere({ id }, {
      relations: ['admin'],
      select: ['id'],
    })

    if (_isEmpty(project)) {
      throw new NotFoundException(`Project with ID ${id} does not exist`)
    }
    this.projectService.allowedToManage(project, uid)

    const query1 = `ALTER table analytics DELETE WHERE pid='${id}'`
    const query2 = `ALTER table customEV DELETE WHERE pid='${id}'`

    try {
      await this.projectService.delete(id)
      await clickhouse.query(query1).toPromise()
      await clickhouse.query(query2).toPromise()
      return 'Project deleted successfully'
    } catch(e) {
      this.logger.error(e)
      return 'Error while deleting your project'
    }
  }
}
