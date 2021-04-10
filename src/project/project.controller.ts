import { Controller, Body, Query, Param, UseGuards, Get, Post, Put, Delete, BadRequestException, 
  HttpCode, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger'

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
  @ApiResponse({status: 200, type: [Project]})
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async get(
    @CurrentUserId() userId: string,
    @Query('take') take: number | undefined,
    @Query('skip') skip: number | undefined,): Promise<Pagination<Project> | Project[]> {
    this.logger.log({ userId, take, skip }, 'GET /project')
    // const user = await this.userService.findOne(userId)
    const where = Object()

    where.admin = userId

    return await this.projectService.paginate({ take, skip }, where)
  }

  @Get('/:id')
  @ApiResponse({ status: 200, type: Project })
  async getOne(@Param('id') id: string): Promise<Project> {
    this.logger.log({ id }, 'GET /project/:id')
    const project = await this.projectService.findOne(id)

    if (project) {
      return project
    } else {
      throw new NotFoundException()
    }
  }

  @Post('/')
  @ApiResponse({ status: 201, type: Project })
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async create(@Body() projectDTO: ProjectDTO, @CurrentUserId() userId: string): Promise<Project> {
    this.logger.log({ projectDTO, userId }, 'POST /project')

    await this.projectService.checkIfIDUnique(projectDTO.id)

    try {
      const project = await this.projectService.create(projectDTO)
      return project
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

    const project = await this.projectService.findOneWithRelations(id)

    if (!project) {
      throw new NotFoundException()
    }

    await this.projectService.allowedToManage(project.id, userId)
    await this.projectService.checkIfIDUnique(projectDTO.id)

    try {
      await this.projectService.update(id, projectDTO)
      return this.projectService.findOne(id)
    } catch(e) {
      if (e.code === 'ER_DUP_ENTRY'){
        if (e.sqlMessage.includes(projectDTO.id)) {
          throw new BadRequestException('Project with selected ID already exists')
        }
      }

      return new BadRequestException(e)
    }
  }

  @Delete('/:id')
  @HttpCode(204)
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 204, description: 'Empty body' })
  async delete(@Param('id') id: string, @CurrentUserId() userId: string): Promise<any> {
    this.logger.log({ userId, id }, 'DELETE /project/:id')
    const project = await this.projectService.findOneWithRelations(id)

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} does not exist`)
    }
    await this.projectService.allowedToManage(project.id, userId)

    try {
      await this.projectService.delete(id)
      return 'Project deleted successfully'
    } catch(e) {
      return e
    }
  }
}
