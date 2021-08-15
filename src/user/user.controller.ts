import { 
  Controller, Query, Req, Body, Param, Get, Post, Put, Delete, HttpCode, BadRequestException, UseGuards, MethodNotAllowedException, Redirect, Header,
} from '@nestjs/common'
import { Request } from 'express'
import { ApiTags, ApiQuery } from '@nestjs/swagger'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as _map from 'lodash/map'
import * as _join from 'lodash/join'
import * as _isNull from 'lodash/isNull'
import * as _isEmpty from 'lodash/isEmpty'

import { UserService } from './user.service'
import { ProjectService } from '../project/project.service'
import {
  User, UserType, MAX_EMAIL_REQUESTS, ACCOUNT_PLANS,
} from './entities/user.entity'
import { Roles } from '../common/decorators/roles.decorator'
import { Pagination } from '../common/pagination/pagination'
import {
  GDPR_EXPORT_TIMEFRAME, clickhouse, STRIPE_SECRET,
} from '../common/constants'
import { RolesGuard } from 'src/common/guards/roles.guard'
import { UpdateUserProfileDTO } from './dto/update-user.dto'
import { UpgradeUserProfileDTO } from './dto/upgrade-user.dto'
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { MailerService } from '../mailer/mailer.service'
import { ActionTokenType } from '../action-tokens/action-token.entity'
import { AuthService } from '../auth/auth.service'
import { LetterTemplate } from 'src/mailer/letter'
import { AppLoggerService } from 'src/logger/logger.service'
import { UserProfileDTO } from './dto/user.dto'

const stripe = require('stripe')(STRIPE_SECRET)

dayjs.extend(utc)

@ApiTags('User')
@Controller('user')
@UseGuards(RolesGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly projectService: ProjectService,
    private readonly actionTokensService: ActionTokensService,
    private readonly mailerService: MailerService,
    private readonly logger: AppLoggerService,
  ) {}

  @Get('/')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async get(@Query('take') take: number | undefined, @Query('skip') skip: number | undefined): Promise<Pagination<User> | User[]> {
    this.logger.log({ take, skip }, 'GET /user')
    return await this.userService.paginate({ take, skip })
  }

  @Get('/search')
  @ApiQuery({ name: 'query', required: false })
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async searchUsers(@Query('query') query: string | undefined): Promise<User[]> {
    this.logger.log({ query }, 'GET /user/search')
    return await this.userService.search(query)
  }

  @Post('/')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async create(@Body() userDTO: UserProfileDTO): Promise<User> {
    this.logger.log({ userDTO }, 'POST /user')
    this.userService.validatePassword(userDTO.password)
    userDTO.password = this.authService.hashPassword(userDTO.password)

    try {
      const user = await this.userService.create({ ...userDTO, isActive: true })
      return user
    } catch(e) {
      if (e.code === 'ER_DUP_ENTRY'){
        if(e.sqlMessage.includes(userDTO.email)) {
          throw new BadRequestException('User with this email already exists')
        }
      }
    }
  }

  @Delete('/:id')
  @HttpCode(204)
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async delete(@Param('id') id: string, @CurrentUserId() uid: string): Promise<any> {
    this.logger.log({ id, uid }, 'DELETE /user/:id')
    const user = await this.userService.findOne(id, {
      relations: ['projects'],
      select: ['id'],
    })

    if (_isEmpty(user)) {
      throw new BadRequestException(`User with id ${id} does not exist`)
    }

    const pids = _join(_map(user.projects, el => `'${el.id}'`), ',')
    const query1 = `ALTER table analytics DELETE WHERE pid IN (${pids})`
    const query2 = `ALTER table customEV DELETE WHERE pid IN (${pids})`

    try {
      await this.projectService.deleteMultiple(pids)
      await clickhouse.query(query1).toPromise()
      await clickhouse.query(query2).toPromise()
      await this.userService.delete(id)
      
      return 'Account has been deleted'
    } catch(e) {
      this.logger.error(e)
      return 'Error while deleting user account'
    }
  }

  @Delete('/')
  @HttpCode(204)
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async deleteSelf(@CurrentUserId() id: string): Promise<any> {
    this.logger.log({ id }, 'DELETE /user')

    const user = await this.userService.findOne(id, {
      relations: ['projects'],
      select: ['id'],
    })

    try {
      if (!_isEmpty(user.projects)) {
        const pids = _join(_map(user.projects, el => `'${el.id}'`), ',')
        const query1 = `ALTER table analytics DELETE WHERE pid IN (${pids})`
        const query2 = `ALTER table customEV DELETE WHERE pid IN (${pids})`
        await this.projectService.deleteMultiple(pids)
        await clickhouse.query(query1).toPromise()
        await clickhouse.query(query2).toPromise()
      }
      await this.userService.delete(id)
      
      return 'Account has been deleted'
    } catch(e) {
      this.logger.error(e)
      return 'Error while deleting your account'
    }
  }

  @Post('/confirm_email')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async sendEmailConfirmation(@CurrentUserId() id: string, @Req() request: Request): Promise<boolean> {
    this.logger.log({ id }, 'POST /confirm_email')
    
    const user = await this.userService.findOneWhere({ id })

    if (!user || !user.email || user.isActive || user.emailRequests >= MAX_EMAIL_REQUESTS) return false

    const token = await this.actionTokensService.createForUser(user, ActionTokenType.EMAIL_VERIFICATION, user.email)
    const url = `${request.headers.origin}/verify/${token.id}`
    
    await this.userService.update(id, { emailRequests: 1 + user.emailRequests })
    await this.mailerService.sendEmail(user.email, LetterTemplate.SignUp, { url })
    return true
  }

  @Put('/:id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async update(@Body() userDTO: UpdateUserProfileDTO, @Param('id') id: string): Promise<User> {
    this.logger.log({ userDTO, id }, 'DELETE /user/:id')
    
    if (userDTO.password) {
      this.userService.validatePassword(userDTO.password)
      userDTO.password = this.authService.hashPassword(userDTO.password)
    }
    
    const user = await this.userService.findOneWhere({ id })
    
    if (!user) {
      throw new BadRequestException('User does not exist')
    }
    
    try {
      await this.userService.update(id, {...user, ...userDTO})
      return this.userService.findOneWhere({ id })
    } catch (e) {
      if(e.code === 'ER_DUP_ENTRY'){
        if(e.sqlMessage.includes(userDTO.email)) {
          throw new BadRequestException('User with this email already exists')
        }
      }
      throw new BadRequestException(e.message)
    }
  }

  @Put('/')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async updateCurrentUser(@Body() userDTO: UpdateUserProfileDTO, @CurrentUserId() id: string, @Req() request: Request): Promise<User> {
    this.logger.log({ userDTO, id }, 'PUT /user')
    const user = await this.userService.findOneWhere({ id })

    if (userDTO.password?.length > 0) {
      this.userService.validatePassword(userDTO.password)
      userDTO.password = this.authService.hashPassword(userDTO.password)
      await this.mailerService.sendEmail(userDTO.email, LetterTemplate.PasswordChanged)
    }

    try {
      if (userDTO.email && user.email !== userDTO.email) {
        const userWithByEmail = await this.userService.findOneWhere({ email: userDTO.email })

        if (userWithByEmail) {
          throw new BadRequestException('User with this email already exists')
        }

        const token = await this.actionTokensService.createForUser(user, ActionTokenType.EMAIL_CHANGE, userDTO.email)
        const url = `${request.headers.origin}/change-email/${token.id}`
        await this.mailerService.sendEmail(user.email, LetterTemplate.MailAddressChangeConfirmation, { url })
      }
      await this.userService.update(id, { ...userDTO })

      return this.userService.findOneWhere({ id })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  @Post('/upgrade')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  // @Redirect('https://swetrix.com/billing', 303)
  async upgradePlan(@Body() body: UpgradeUserProfileDTO, @CurrentUserId() user_id: string): Promise<object> {
    this.logger.log({ body, user_id }, 'POST /user/upgrade')
    const user = await this.userService.findOne(user_id, {
      select: ['email'],
    })
    
    const { planCode } = body
    const priceId = ACCOUNT_PLANS[planCode]?.priceId

    if (_isEmpty(priceId)) {
      throw new BadRequestException('Incorrect planCode provided')
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: 'https://swetrix.com/billing?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://swetrix.com/billing',
    })

    console.log(session)

    return {
      url: session.url,
    }
  }

  @Get('/export')
  @UseGuards(RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  async exportUserData(@CurrentUserId() user_id: string): Promise<User> {
    this.logger.log({ user_id }, 'GET /user/export')
    const user = await this.userService.findOneWhere({ id: user_id })
    const where = Object({ admin: user_id })
    const projects = await this.projectService.findWhere(where)

    if (!_isNull(user.exportedAt) && !dayjs().isAfter(dayjs.utc(user.exportedAt).add(GDPR_EXPORT_TIMEFRAME, 'day'), 'day')) {
      throw new MethodNotAllowedException(`Please, try again later. You can request a GDPR Export only once per ${GDPR_EXPORT_TIMEFRAME} days.`)
    }

    const data = {
      user: {
        ...user,
        created: dayjs(user.created).format('YYYY/MM/DD HH:mm:ss'),
        updated: dayjs(user.updated).format('YYYY/MM/DD HH:mm:ss'),
        exportedAt: _isNull(user.exportedAt) ? '-' : dayjs(user.exportedAt).format('YYYY/MM/DD HH:mm:ss'),
      },
      projects: _map(projects, project => ({
        ...project,
        created: dayjs(project.created).format('YYYY/MM/DD HH:mm:ss'),
        origins: _join(project.origins, ', '),
      }))
    }

    await this.mailerService.sendEmail(user.email, LetterTemplate.GDPRDataExport, data)
    await this.userService.update(user.id, {
      exportedAt: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
    })

    return user
  }
}
