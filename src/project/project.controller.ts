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
  Headers,
  NotImplementedException,
  Patch,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger'
import * as _isEmpty from 'lodash/isEmpty'
import * as _map from 'lodash/map'
import * as _trim from 'lodash/trim'
import * as _size from 'lodash/size'
import * as _includes from 'lodash/includes'
import * as _omit from 'lodash/omit'
import * as _filter from 'lodash/filter'

import { ProjectService, processProjectUser, deleteProjectRedis } from './project.service'
import { UserType, ACCOUNT_PLANS, PlanCode } from '../user/entities/user.entity'
import { ActionTokenType } from '../action-tokens/action-token.entity'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { MailerService } from '../mailer/mailer.service'
import { LetterTemplate } from '../mailer/letter'
import { Roles } from '../auth/decorators/roles.decorator'
import { SelfhostedGuard } from '../common/guards/selfhosted.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Pagination } from '../common/pagination/pagination'
import { Project } from './entity/project.entity'
import { ProjectShare, roles } from './entity/project-share.entity'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { UserService } from '../user/user.service'
import { ProjectDTO } from './dto/project.dto'
import { ShareDTO } from './dto/share.dto'
import { ShareUpdateDTO } from './dto/share-update.dto'
import { AppLoggerService } from '../logger/logger.service'
import {
  isValidPID,
  clickhouse,
  isSelfhosted,
  PROJECT_INVITE_EXPIRE,
  CAPTCHA_SECRET_KEY_LENGTH,
  isDevelopment,
  PRODUCTION_ORIGIN,
} from '../common/constants'
import {
  getProjectsClickhouse,
  createProjectClickhouse,
  updateProjectClickhouse,
  deleteProjectClickhouse,
  generateRandomString,
} from '../common/utils'
import { JwtAccessTokenGuard } from 'src/auth/guards'
import { Auth, Public } from 'src/auth/decorators'
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
} from './dto'

const PROJECTS_MAXIMUM = ACCOUNT_PLANS[PlanCode.free].maxProjects

const isValidShareDTO = (share: ShareDTO): boolean => {
  return !_isEmpty(_trim(share.email)) && _includes(roles, share.role)
}

const isValidUpdateShareDTO = (share: ShareUpdateDTO): boolean => {
  return _includes(roles, share.role)
}

@ApiTags('Project')
@Controller('project')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly userService: UserService,
    private readonly logger: AppLoggerService,
    private readonly actionTokensService: ActionTokensService,
    private readonly mailerService: MailerService,
  ) { }

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
    @Query('isCaptcha') isCaptchaStr: string | undefined,
  ): Promise<Pagination<Project> | Project[] | object> {
    this.logger.log({ userId, take, skip }, 'GET /project')
    const isCaptcha = isCaptchaStr === 'true'

    if (isSelfhosted) {
      const results = await getProjectsClickhouse()
      const formatted = _map(results, this.projectService.formatFromClickhouse)
      return {
        results,
        page_total: _size(formatted),
        total: _size(formatted),
        totalMonthlyEvents: 0, // not needed as it's selfhosed
      }
    } else {
      const where = Object()
      where.admin = userId

      if (isCaptcha) {
        where.isCaptchaProject = true
      } else {
        where.isAnalyticsProject = true
      }

      const paginated = await this.projectService.paginate(
        { take, skip },
        where,
      )

      const totalMonthlyEvents = await this.projectService.getRedisCount(userId)

      paginated.results = _map(paginated.results, p => ({
        ...p,
        isOwner: true,
      }))

      return {
        ...paginated,
        totalMonthlyEvents,
      }
    }
  }

  @Get('/shared')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'relatedonly', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [Project] })
  @Auth([UserType.CUSTOMER, UserType.ADMIN], true)
  async getShared(
    @CurrentUserId() userId: string,
    @Query('take') take: number | undefined,
    @Query('skip') skip: number | undefined,
  ): Promise<Pagination<ProjectShare> | ProjectShare[] | object> {
    this.logger.log({ userId, take, skip }, 'GET /project/shared')

    if (isSelfhosted) {
      throw new NotImplementedException(
        'This feature is not available on selfhosted yet',
      )
    } else {
      const where = Object()
      where.user = userId

      const paginated = await this.projectService.paginateShared(
        { take, skip },
        where,
      )

      return {
        ...paginated,
      }
    }
  }

  @Get('/all')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @UseGuards(SelfhostedGuard)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Auth([UserType.ADMIN])
  @ApiResponse({ status: 200, type: Project })
  async getAllProjects(
    @Query('take') take: number | undefined,
    @Query('skip') skip: number | undefined,
  ): Promise<Project | object> {
    this.logger.log({ take, skip }, 'GET /all')

    const where = Object()
    return await this.projectService.paginate({ take, skip }, where)
  }

  @Get('/user/:id')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'relatedonly', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [Project] })
  @UseGuards(SelfhostedGuard)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async getUserProject(
    @Param('id') userId: string,
    @Query('take') take: number | undefined,
    @Query('skip') skip: number | undefined,
  ): Promise<Pagination<Project> | Project[] | object> {
    this.logger.log({ userId, take, skip }, 'GET /user/:id')

    const where = Object()
    where.admin = userId

    const paginated = await this.projectService.paginate({ take, skip }, where)
    const totalMonthlyEvents = await this.projectService.getRedisCount(userId)

    return {
      ...paginated,
      totalMonthlyEvents,
    }
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

    let project

    if (isSelfhosted) {
      project = await getProjectsClickhouse(id)
    } else {
      project = await this.projectService.findOne(id, {
        relations: ['admin'],
      })
    }

    if (_isEmpty(project)) {
      throw new NotFoundException('Project was not found in the database')
    }

    this.projectService.allowedToView(project, uid)

    if (isSelfhosted) {
      return this.projectService.formatFromClickhouse(project)
    }

    return {
      ..._omit(project, ['admin']),
      isOwner: uid === project.admin?.id,
    }
  }

  @Post('/admin/:id')
  @ApiResponse({ status: 201, type: Project })
  @UseGuards(SelfhostedGuard)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  async createForAdmin(
    @Param('id') userId: string,
    @Body() projectDTO: ProjectDTO,
  ): Promise<Project> {
    this.logger.log({ userId, projectDTO }, 'POST /project/admin/:id')

    const user = await this.userService.findOneWithRelations(userId, [
      'projects',
    ])
    const maxProjects = ACCOUNT_PLANS[user.planCode]?.maxProjects

    if (!user.isActive) {
      throw new ForbiddenException(
        "User's email address has to be verified first",
      )
    }

    if (_size(user.projects) >= (maxProjects || PROJECTS_MAXIMUM)) {
      throw new ForbiddenException(
        `The user's plan supports maximum of ${maxProjects} projects`,
      )
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

  @Post('/')
  @ApiResponse({ status: 201, type: Project })
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async create(
    @Body() projectDTO: ProjectDTO,
    @CurrentUserId() userId: string,
  ): Promise<Project> {
    this.logger.log({ projectDTO, userId }, 'POST /project')

    if (isSelfhosted) {
      const projects = await getProjectsClickhouse()

      this.projectService.validateProject(projectDTO)
      this.projectService.checkIfIDUniqueClickhouse(projects, projectDTO.id)

      const project = new Project()
      Object.assign(project, projectDTO)
      project.origins = _map(projectDTO.origins, _trim)
      project.active = true

      await createProjectClickhouse(project)

      return project
    } else {
      const user = await this.userService.findOneWithRelations(userId, [
        'projects',
      ])
      const maxProjects = ACCOUNT_PLANS[user.planCode]?.maxProjects

      if (!user.isActive) {
        throw new ForbiddenException('Please, verify your email address first')
      }

      if (user.planCode === PlanCode.none) {
        throw new ForbiddenException(
          'You cannot create new projects due to no active subscription. Please upgrade your account plan to continue.',
        )
      }

      if (projectDTO.isCaptcha) {
        if (_size(_filter(user.projects, (project: Project) => project.isCaptchaProject) >= (maxProjects || PROJECTS_MAXIMUM))) {
          throw new ForbiddenException(
            `You cannot create more than ${maxProjects} projects on your account plan. Please upgrade to be able to create more projects.`,
          )
        }
      } else {
        if (_size(_filter(user.projects, (project: Project) => project.isAnalyticsProject) >= (maxProjects || PROJECTS_MAXIMUM))) {
          throw new ForbiddenException(
            `You cannot create more than ${maxProjects} projects on your account plan. Please upgrade to be able to create more projects.`,
          )
        }
      }

      this.projectService.validateProject(projectDTO)

      await this.projectService.checkIfIDUnique(projectDTO.id)

      try {
        const project = new Project()
        Object.assign(project, projectDTO)
        project.origins = _map(projectDTO.origins, _trim)

        if (projectDTO.isCaptcha) {
          project.isCaptchaProject = true
          project.isAnalyticsProject = false
          project.isCaptchaEnabled = true
          project.captchaSecretKey = generateRandomString(CAPTCHA_SECRET_KEY_LENGTH)
        }

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

    if (isSelfhosted) {
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
    } else {
      const user = await this.userService.findOne(uid)
      const project = await this.projectService.findOneWhere(
        { id },
        {
          relations: ['admin'],
          select: ['id'],
        },
      )

      if (_isEmpty(project)) {
        throw new NotFoundException(`Project with ID ${id} does not exist`)
      }

      this.projectService.allowedToManage(project, uid, user.roles)

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
  }

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

    const query = `ALTER table captcha DELETE WHERE pid='${id}'`

    if (isSelfhosted) {
      try {
        await clickhouse.query(query).toPromise()
        return 'CAPTCHA project resetted successfully'
      } catch (e) {
        this.logger.error(e)
        return 'Error while resetting your CAPTCHA project'
      }
    } else {
      const user = await this.userService.findOne(uid)
      const project = await this.projectService.findOneWhere(
        { id },
        {
          relations: ['admin'],
          select: ['id'],
        },
      )

      if (_isEmpty(project)) {
        throw new NotFoundException(`Project with ID ${id} does not exist`)
      }

      this.projectService.allowedToManage(project, uid, user.roles)

      try {
        await clickhouse.query(query).toPromise()
        return 'CAPTCHA project resetted successfully'
      } catch (e) {
        this.logger.error(e)
        return 'Error while resetting your CAPTCHA project'
      }
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
    let project

    if (isSelfhosted) {
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
    } else {
      project = await this.projectService.findOne(id, {
        relations: ['admin', 'share', 'share.user'],
      })
      const user = await this.userService.findOne(uid)

      if (_isEmpty(project)) {
        throw new NotFoundException()
      }

      this.projectService.allowedToManage(project, uid, user.roles)

      project.active = projectDTO.active
      project.origins = _map(projectDTO.origins, _trim)
      project.ipBlacklist = _map(projectDTO.ipBlacklist, _trim)
      project.name = projectDTO.name
      project.public = projectDTO.public

      if (project.isAnalyticsProject && projectDTO.isCaptcha) {
        const captchaProjects = _filter(user.projects, (project: Project) => project.isCaptchaProject)
        const maxProjects = ACCOUNT_PLANS[user.planCode]?.maxProjects

        console.log('asd')
        if (_size(captchaProjects >= (maxProjects || PROJECTS_MAXIMUM))) {
          throw new ForbiddenException(
            `You cannot create more than ${maxProjects} projects on your account plan. Please upgrade to be able to create more projects.`,
          )
        }

        project.isCaptchaProject = true
        project.isCaptchaEnabled = true
      }

      await this.projectService.update(id, _omit(project, ['share', 'admin']))
    }

    // await updateProjectRedis(id, project)
    await deleteProjectRedis(id)

    return project
  }

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

    let secret: string = null

    if (isSelfhosted) {
      const project = await getProjectsClickhouse(pid)

      if (_isEmpty(project)) {
        throw new NotFoundException()
      }
      secret = generateRandomString(CAPTCHA_SECRET_KEY_LENGTH)

      project.captchaSecretKey = secret

      await updateProjectClickhouse(
        this.projectService.formatToClickhouse(project),
      )
    } else {
      const project = await this.projectService.findOne(pid, {
        relations: ['admin'],
      })
      const user = await this.userService.findOne(uid)

      if (_isEmpty(project)) {
        throw new NotFoundException()
      }

      this.projectService.allowedToManage(project, uid, user.roles)

      secret = generateRandomString(CAPTCHA_SECRET_KEY_LENGTH)

      // @ts-ignore
      await this.projectService.update(pid, { captchaSecretKey: secret })
    }

    await deleteProjectRedis(pid)

    return secret
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

    if (isSelfhosted) {
      // todo: delete share for selfhosted
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
    } else {
      const user = await this.userService.findOne(uid)
      const project = await this.projectService.findOneWhere(
        { id },
        {
          relations: ['admin'],
          select: ['id'],
        },
      )

      if (_isEmpty(project)) {
        throw new NotFoundException(`Project with ID ${id} does not exist`)
      }

      this.projectService.allowedToManage(project, uid, user.roles)

      const query1 = `ALTER table analytics DELETE WHERE pid='${id}'`
      const query2 = `ALTER table customEV DELETE WHERE pid='${id}'`

      try {
        await clickhouse.query(query1).toPromise()
        await clickhouse.query(query2).toPromise()
        await deleteProjectRedis(id)
      } catch (e) {
        this.logger.error(e)
        return 'Error while deleting your project'
      }

      try {
        if (project.isCaptchaProject) {
          project.isAnalyticsProject = false
          await this.projectService.update(id, project)
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
  }

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

    if (isSelfhosted) {
      // TODO
    } else {
      const user = await this.userService.findOne(uid)
      const project = await this.projectService.findOneWhere(
        { id },
        {
          relations: ['admin'],
          select: ['id'],
        },
      )

      if (_isEmpty(project)) {
        throw new NotFoundException(`Project with ID ${id} does not exist`)
      }

      this.projectService.allowedToManage(project, uid, user.roles)

      const query = `ALTER table captcha DELETE WHERE pid='${id}'`

      try {
        await clickhouse.query(query).toPromise()

        project.captchaSecretKey = null
        project.isCaptchaEnabled = false
        project.isCaptchaProject = false

        await this.projectService.update(id, project)

        return 'CAPTCHA project deleted successfully'
      } catch (e) {
        this.logger.error(e)
        return 'Error while deleting your CAPTCHA project'
      }
    }
  }

  // The routes related to sharing projects feature
  @Delete('/:pid/:shareId')
  @HttpCode(204)
  @UseGuards(SelfhostedGuard)
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

    // TODO: Discuss.
    // I'm not sure if we should select 'share' from project too.
    // If we select share - this means that the share project admins would be able to delete other people from project share too
    // (as the allowedToManage method would pass for them).
    const project = await this.projectService.findOneWhere(
      { id: pid },
      {
        relations: ['admin'],
        select: ['id', 'admin'],
      },
    )

    if (_isEmpty(project)) {
      throw new NotFoundException(`Project with ID ${pid} does not exist`)
    }

    const user = await this.userService.findOne(uid)

    this.projectService.allowedToManage(project, uid, user.roles)

    await deleteProjectRedis(pid)
    await this.projectService.deleteShare(shareId)
  }

  @Post('/:pid/share')
  @HttpCode(200)
  @UseGuards(SelfhostedGuard)
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

    const user = await this.userService.findOne(uid)
    const project = await this.projectService.findOneWhere(
      { id: pid },
      {
        relations: ['admin', 'share'],
        select: ['id', 'admin', 'share'],
      },
    )

    if (_isEmpty(project)) {
      throw new NotFoundException(`Project with ID ${pid} does not exist`)
    }

    this.projectService.allowedToManage(project, uid, user.roles)

    const invitee = await this.userService.findOneWhere(
      {
        email: shareDTO.email,
      },
      ['sharedProjects'],
    )

    if (!invitee) {
      throw new NotFoundException(
        `User with email ${shareDTO.email} is not registered on Swetrix`,
      )
    }

    if (invitee.id === user.id) {
      throw new BadRequestException('You cannot share with yourself')
    }

    const isSharingWithUser = !_isEmpty(
      await this.projectService.findShare({
        where: {
          project: project.id,
          user: invitee.id,
        },
      }),
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
      const url = `${isDevelopment ? headers.origin : PRODUCTION_ORIGIN}/share/${actionToken.id}`
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

      const updatedProject = await this.projectService.findOne(pid, {
        relations: ['share', 'share.user'],
      })

      // todo: maybe the update project should be used here instead of delete?
      await deleteProjectRedis(pid)
      return processProjectUser(updatedProject)
    } catch (e) {
      console.error(
        `[ERROR] Could not share project (pid: ${project.id}, invitee ID: ${invitee.id}): ${e}`,
      )
      throw new BadRequestException(e)
    }
  }

  @Put('/share/:shareId')
  @HttpCode(200)
  @UseGuards(SelfhostedGuard)
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

    const user = await this.userService.findOne(uid)
    const share = await this.projectService.findOneShare(shareId, {
      relations: ['project', 'project.admin'],
    })

    if (_isEmpty(share)) {
      throw new NotFoundException(`Share with ID ${shareId} does not exist`)
    }

    if (share.project?.admin?.id !== uid) {
      throw new NotFoundException(`You are not allowed to edit this share`)
    }

    this.projectService.allowedToManage(share.project, uid, user.roles)

    const { role } = shareDTO
    await this.projectService.updateShare(shareId, {
      role,
    })

    await deleteProjectRedis(share.project.id)
    return await this.projectService.findOneShare(shareId)
  }

  @HttpCode(204)
  @UseGuards(SelfhostedGuard)
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
      const { newValue: shareId, id } = actionToken

      const share = await this.projectService.findOneShare(shareId)
      share.confirmed = true

      if (_isEmpty(share)) {
        throw new BadRequestException('The provided share ID is not valid')
      }

      // if (share.user?.id !== user.id) {
      //   throw new BadRequestException('You are not allowed to manage this share')
      // }

      await this.projectService.updateShare(shareId, share)
      await this.actionTokensService.delete(id)
    }
  }

  @Post(':projectId/subscribers')
  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  async addSubscriber(
    @Param() params: AddSubscriberParamsDto,
    @Body() body: AddSubscriberBodyDto,
    @Headers() headers: { origin: string },
    @CurrentUserId() userId: string,
  ) {
    const project = await this.projectService.getProject(
      params.projectId,
      userId,
    )

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    const user = await this.userService.getUser(userId)

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

    return await this.projectService.addSubscriber({
      userId,
      projectId: params.projectId,
      projectName: project.name,
      email: body.email,
      reportFrequency: body.reportFrequency,
      origin: isDevelopment ? headers.origin : PRODUCTION_ORIGIN,
    })
  }

  @Get(':projectId/subscribers/invite')
  @HttpCode(HttpStatus.OK)
  async confirmSubscriberInvite(
    @Param() params: ConfirmSubscriberInviteParamsDto,
    @Query() queries: ConfirmSubscriberInviteQueriesDto,
  ): Promise<void> {
    const project = await this.projectService.getProjectById(params.projectId)

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
    const project = await this.projectService.getProject(
      params.projectId,
      userId,
    )

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    return await this.projectService.getSubscribers(params.projectId, queries)
  }

  @Patch(':projectId/subscribers/:subscriberId')
  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  async updateSubscriber(
    @Param() params: UpdateSubscriberParamsDto,
    @Body() body: UpdateSubscriberBodyDto,
    @CurrentUserId() userId: string,
  ) {
    const project = await this.projectService.getProject(
      params.projectId,
      userId,
    )

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    const subscriber = await this.projectService.getSubscriber(
      params.projectId,
      params.subscriberId,
    )

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found.')
    }

    return await this.projectService.updateSubscriber(
      params.projectId,
      params.subscriberId,
      body,
    )
  }

  @Delete(':projectId/subscribers/:subscriberId')
  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  async removeSubscriber(
    @Param() params: RemoveSubscriberParamsDto,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    const project = await this.projectService.getProject(
      params.projectId,
      userId,
    )

    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    const subscriber = await this.projectService.getSubscriber(
      params.projectId,
      params.subscriberId,
    )

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found.')
    }

    await this.projectService.removeSubscriber(
      params.projectId,
      params.subscriberId,
    )
  }
}
