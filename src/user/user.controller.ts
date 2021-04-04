import { 
  Controller, Query, Req, Body, Param, Get, Post, Put, Delete, HttpCode, BadRequestException, UseGuards
} from '@nestjs/common'
import { Request } from 'express'
import { ApiTags, ApiQuery } from '@nestjs/swagger'

import { UserService } from './user.service'
import { UserType } from './entities/user.entity'
import { Roles } from '../common/decorators/roles.decorator'
// import { Pagination } from '../common/pagination/pagination'
// import { User, UserType, MAX_EMAIL_REQUESTS } from './entities/user.entity'
// import { CustomerDto } from './dto/customer.dto'
import { RolesGuard } from 'src/common/guards/roles.guard'
// import { UsersService } from '../users/users.service'
// import { UpdateCustomerDto } from './dto/update-customer'
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { MailerService } from '../mailer/mailer.service'
// import { ActionTokenType } from '../action-tokens/action-token.entity'
import { AuthService } from '../auth/auth.service'
// import { LetterTemplate } from 'src/mailer/lettter'
import { AppLoggerService } from 'src/logger/logger.service'

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

  // @Get('/')
  // @ApiQuery({ name: 'take', required: false })
  // @ApiQuery({ name: 'skip', required: false })
  // @Roles(UserType.ADMIN)
  // async get(@Query('take') take: number | undefined, @Query('skip') skip: number | undefined):
  // Promise<Pagination<Customer> | Customer[]> 
  // {
  //   this.logger.log({take, skip}, 'GET /customers')
  //   return await this.customersService.paginate({take, skip})
  // }

  // @Get('/search')
  // @ApiQuery({ name: 'query', required: false })
  // @Roles(UserType.ADMIN)
  // async searchCustomers(
  //   @Query('query') query: string | undefined,
  //   ) :Promise<Customer[]> 
  // {
  //   this.logger.log({query}, 'GET /customers/search')
  //   return await this.customersService.search(query)
  // }

  // @Post('/')
  // @Roles(UserType.ADMIN)
  // async create(@Body() customerDto: CustomerDto): Promise<Customer> {
  //   this.logger.log({customerDto}, 'POST /customers')
  //   this.usersService.validatePassword(customerDto.password)
  //   customerDto.password = this.authService.hashPassword(customerDto.password)
  //   try {
  //     const customer = await this.customersService.create({...customerDto, isActive: true})
  //     return customer
  //   } catch(e){
  //     if(e.code === 'ER_DUP_ENTRY'){
  //       if(e.sqlMessage.includes(customerDto.email)) {
  //         throw new BadRequestException('User with this email already exists')
  //       } else if(e.sqlMessage.includes(customerDto.phone)) {
  //         throw new BadRequestException('User with this phone already exists')
  //       }
  //     }
  //   }
  // }

  @Delete('/:id')
  @HttpCode(204)
  @Roles(UserType.ADMIN)
  async delete(@Param('id') id: string, @CurrentUserId() uid: string):
  Promise<any> {
    this.logger.log({ id, uid }, 'DELETE /customers/:id')
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
    this.logger.log({ uid }, 'DELETE /customers')
    await this.userService.delete(uid)
    return
  }

  // @Put('/:id')
  // @Roles(UserType.ADMIN)
  // async update(@Body() customerDto: UpdateCustomerDto, @Param('id') id: string): Promise<Customer> {
  //   this.logger.log({customerDto, id}, 'DELETE /customers/:id')
  //   if(customerDto.password) {
  //     this.usersService.validatePassword(customerDto.password)
  //     customerDto.password = this.authService.hashPassword(customerDto.password)
  //   }
  //   const customer = await this.customersService.findOneWhere({id})
  //   if(!customer){
  //     throw new BadRequestException('User does not exist')
  //   }
  //   try {
  //     await this.customersService.update(id, {...customer, ...customerDto})
  //     return this.customersService.findOneWhere({id})
  //   } catch (e) {
  //     if(e.code === 'ER_DUP_ENTRY'){
  //       if(e.sqlMessage.includes(customerDto.email)) {
  //         throw new BadRequestException('User with this email already exists')
  //       } else if(e.sqlMessage.includes(customerDto.phone)) {
  //         throw new BadRequestException('User with this phone already exists')
  //       }
  //     }
  //     throw new BadRequestException(e.message)
  //   }
  // }

  // @Post('/confirm_email')
  // @Roles(UserType.FREE)
  // async sendEmailConfirmation(@CurrentUserId() id: string, @Req() request: Request): Promise<boolean> {
  //   this.logger.log({ id }, 'POST /confirm_email')
    
  //   const customer = await this.customersService.findOneWhere({ id })
  //   console.log(customer)
  //   if (!customer || !customer.email || customer.isActive || customer.emailRequests >= MAX_EMAIL_REQUESTS) return false

  //   const token = await this.actionTokensService.createForCustomer(customer, ActionTokenType.EMAIL_VERIFICATION, customer.email)
  //   const url = `${request.headers.origin}/verify/${token.id}`
    
  //   await this.customersService.update(id, { emailRequests: 1 + customer.emailRequests })
  //   await this.mailerService.sendEmail(customer.email, LetterTemplate.SignUp, customer.locale, { url })
  //   return true
  // }

  // @Put('/')
  // @Roles(UserType.FREE)
  // async updateCurrentCustomer(
  //   @Body() customerDto: UpdateCustomerDto,
  //   @CurrentUserId() customerId: string,
  //   @Req() request: Request):
  //   Promise<Customer> {
  //   this.logger.log({customerDto, customerId}, 'PUT /customers')
  //   const customer = await this.customersService.findOneWhere({id: customerId})
  //   if(customerDto.password && customerDto.password.length > 0) {
  //     this.usersService.validatePassword(customerDto.password)
  //     customerDto.password = this.authService.hashPassword(customerDto.password)
  //     await this.mailerService.sendEmail(customerDto.email, LetterTemplate.PasswordChanged, customerDto.locale )
  //   }
  //   try {
  //     if(customerDto.email && customer.email !== customerDto.email) {
  //       const userWithByEmail = this.customersService.findOneWhere({email: customerDto.email})
  //       if(userWithByEmail){
  //         customerDto.email = customer.email
  //       } else {
  //         throw new BadRequestException('User with this email already exists')
  //       }
  //       const token = await this.actionTokensService.createForCustomer(
  //         customer, ActionTokenType.EMAIL_CHANGE, customerDto.email)
  //       const url = `${request.headers.origin}/change-email/${token.id}`
  //       await this.mailerService.sendEmail(
  //         customer.email, LetterTemplate.MailAddressChangeConfirmation, customerDto.locale, { url })
  //     }
  //     await this.customersService.update(customerId, {...customerDto})

  //     return this.customersService.findOneWhere({id: customerId})
  //   } catch (e) {
  //     if(e.code === 'ER_DUP_ENTRY'){
  //       if(e.sqlMessage.includes(customerDto.phone)) {
  //         throw new BadRequestException('User with this phone already exists')
  //       }
  //     }
  //     throw new BadRequestException(e.message)
  //   }
  // }
}
