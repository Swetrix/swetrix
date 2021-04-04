import { 
  Controller, Query, Req, Body, Param, Get, Post, Put, Delete, HttpCode, BadRequestException, UseGuards
} from '@nestjs/common'
import { Request } from 'express'
import { ApiTags, ApiQuery } from '@nestjs/swagger'

import { UserService } from './user.service'
import { User, UserType, MAX_EMAIL_REQUESTS } from './entities/user.entity'
import { Roles } from '../common/decorators/roles.decorator'
import { Pagination } from '../common/pagination/pagination'
import { RolesGuard } from 'src/common/guards/roles.guard'
import { UpdateUserProfileDTO } from './dto/update-user.dto'
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { MailerService } from '../mailer/mailer.service'
import { ActionTokenType } from '../action-tokens/action-token.entity'
import { AuthService } from '../auth/auth.service'
import { LetterTemplate } from 'src/mailer/lettter'
import { AppLoggerService } from 'src/logger/logger.service'
import { UserProfileDTO } from './dto/user.dto'

@ApiTags('User')
@Controller('user')
@UseGuards(RolesGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly actionTokensService: ActionTokensService,
    private readonly mailerService: MailerService,
    private readonly logger: AppLoggerService
  ) {}

  @Get('/')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @Roles(UserType.ADMIN)
  async get(@Query('take') take: number | undefined, @Query('skip') skip: number | undefined): Promise<Pagination<User> | User[]> {
    this.logger.log({ take, skip }, 'GET /user')
    return await this.userService.paginate({ take, skip })
  }

  @Get('/search')
  @ApiQuery({ name: 'query', required: false })
  @Roles(UserType.ADMIN)
  async searchUsers(@Query('query') query: string | undefined): Promise<User[]> {
    this.logger.log({ query }, 'GET /user/search')
    return await this.userService.search(query)
  }

  @Post('/')
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
  @Roles(UserType.ADMIN)
  async delete(@Param('id') id: string, @CurrentUserId() uid: string): Promise<any> {
    this.logger.log({ id, uid }, 'DELETE /user/:id')
    const userToDelete = await this.userService.findOneWhere({ id })

    if (!userToDelete) {
      throw new BadRequestException(`User with id ${id} does not exist`)
    }
    
    await this.userService.delete(id)
    return
  }

  @Delete('/')
  @HttpCode(204)
  @Roles(UserType.FREE)
  async deleteSelf(@CurrentUserId() uid: string): Promise<any> {
    this.logger.log({ uid }, 'DELETE /user')
    await this.userService.delete(uid)
    return
  }

  @Post('/confirm_email')
  @Roles(UserType.FREE)
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
  @Roles(UserType.FREE)
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
}
