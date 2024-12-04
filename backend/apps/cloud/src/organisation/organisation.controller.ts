import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
  HttpCode,
  Headers,
  Get,
  Query,
  ForbiddenException,
} from '@nestjs/common'
import { ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger'
import { isEmpty as _isEmpty, find as _find } from 'lodash'
import { FindOptionsWhere, ILike, In } from 'typeorm'

import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { UserType } from '../user/entities/user.entity'
import { Organisation } from './entity/organisation.entity'
import { OrganisationService } from './organisation.service'
import { UserService } from '../user/user.service'
import { MailerService } from '../mailer/mailer.service'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { ActionTokenType } from '../action-tokens/action-token.entity'
import {
  CreateOrganisationDTO,
  InviteMemberDTO,
  UpdateMemberRoleDTO,
} from './dto/organisation.dto'
import { OrganisationRole } from './entity/organisation-member.entity'
import { AppLoggerService } from '../logger/logger.service'
import { LetterTemplate } from '../mailer/letter'
import { Auth } from '../auth/decorators'
import { Pagination } from '../common/pagination'

const ORGANISATION_INVITE_EXPIRE = 7 * 24 // 7 days in hours
const { PRODUCTION_ORIGIN, isDevelopment } = process.env

@Controller('organisation')
export class OrganisationController {
  constructor(
    private readonly organisationService: OrganisationService,
    private readonly userService: UserService,
    private readonly mailerService: MailerService,
    private readonly actionTokensService: ActionTokensService,
    private readonly logger: AppLoggerService,
  ) {}

  @ApiBearerAuth()
  @Get('/')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, type: [Organisation] })
  @Auth([], true)
  async get(
    @CurrentUserId() userId: string,
    @Query('take') take: number | undefined,
    @Query('skip') skip: number | undefined,
    @Query('search') search: string | undefined,
  ): Promise<Pagination<Organisation> | Organisation[] | object> {
    this.logger.log({ userId, take, skip }, 'GET /organisation')

    let where: FindOptionsWhere<Organisation> | FindOptionsWhere<Organisation>[]

    if (search) {
      where = {
        members: {
          user: { id: userId },
          role: In([OrganisationRole.owner, OrganisationRole.admin]),
        },
        name: ILike(`%${search}%`),
      }
    } else {
      where = {
        members: {
          user: { id: userId },
          role: In([OrganisationRole.owner, OrganisationRole.admin]),
        },
      }
    }

    const paginated = await this.organisationService.paginate(
      { take, skip },
      where,
    )

    return paginated
  }

  @ApiBearerAuth()
  @Get('/:orgId')
  @ApiResponse({ status: 200, type: Organisation })
  @Auth([], true)
  async getOne(
    @Param('orgId') orgId: string,
    @CurrentUserId() userId: string,
  ): Promise<Organisation> {
    this.logger.log({ orgId, userId }, 'GET /organisation/:orgId')

    const canManage = await this.organisationService.canManageOrganisation(
      orgId,
      userId,
    )

    if (!canManage) {
      throw new ForbiddenException(
        'You do not have permission to manage this organisation',
      )
    }

    return this.organisationService.findOne({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        members: {
          id: true,
          role: true,
          created: true,
          confirmed: true,
          user: {
            email: true,
          },
        },
        projects: {
          id: true,
          name: true,
          admin: {
            email: true,
          },
        },
      },
      relations: ['members', 'members.user', 'projects', 'projects.admin'],
    })
  }

  @ApiBearerAuth()
  @Post('/')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 200, type: Organisation })
  @Auth([], true)
  async create(
    @Body() createOrgDTO: CreateOrganisationDTO,
    @CurrentUserId() uid: string,
  ): Promise<Organisation> {
    this.logger.log({ uid, createOrgDTO }, 'POST /organisation')

    const user = await this.userService.findOne({ where: { id: uid } })

    const organisation = await this.organisationService.create({
      name: createOrgDTO.name,
    })

    await this.organisationService.createMembership({
      role: OrganisationRole.owner,
      user,
      organisation,
    })

    return organisation
  }

  @ApiBearerAuth()
  @Post('/:orgId/invite')
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @Auth([], true)
  async inviteMember(
    @Param('orgId') orgId: string,
    @Body() inviteDTO: InviteMemberDTO,
    @CurrentUserId() uid: string,
    @Headers() headers,
  ): Promise<Organisation> {
    this.logger.log(
      { uid, orgId, inviteDTO },
      'POST /organisation/:orgId/invite',
    )

    const user = await this.userService.findOne({ where: { id: uid } })
    const organisation = await this.organisationService.findOne({
      where: { id: orgId },
      relations: ['members', 'members.user'],
    })

    if (_isEmpty(organisation)) {
      throw new NotFoundException(
        `Organisation with ID ${orgId} does not exist`,
      )
    }

    await this.organisationService.validateManageAccess(organisation, uid)

    const invitee = await this.userService.findOne({
      where: { email: inviteDTO.email },
      relations: ['organisationMemberships'],
    })

    if (!invitee) {
      throw new NotFoundException(
        `User with email ${inviteDTO.email} is not registered`,
      )
    }

    if (invitee.id === user.id) {
      throw new BadRequestException('You cannot invite yourself')
    }

    const isAlreadyMember = !_isEmpty(
      _find(organisation.members, member => member.user?.id === invitee.id),
    )

    if (isAlreadyMember) {
      throw new BadRequestException(
        `User ${invitee.email} is already a member of this organisation`,
      )
    }

    try {
      const membership = await this.organisationService.createMembership({
        role: inviteDTO.role,
        user: invitee,
        organisation,
      })

      const actionToken = await this.actionTokensService.createForUser(
        user,
        ActionTokenType.ORGANISATION_INVITE,
        membership.id,
      )

      const url = `${
        isDevelopment ? headers.origin : PRODUCTION_ORIGIN
      }/organisation/invite/${actionToken.id}`

      await this.mailerService.sendEmail(
        invitee.email,
        LetterTemplate.OrganisationInvitation,
        {
          url,
          email: user.email,
          name: organisation.name,
          role: membership.role,
          expiration: ORGANISATION_INVITE_EXPIRE,
        },
      )

      return await this.organisationService.findOne({
        where: { id: orgId },
        relations: ['members', 'members.user'],
      })
    } catch (reason) {
      console.error(
        `[ERROR] Could not invite to organisation (orgId: ${organisation.id}, invitee ID: ${invitee.id}): ${reason}`,
      )
      throw new BadRequestException(reason)
    }
  }

  @ApiBearerAuth()
  @Put('/member/:memberId')
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @Auth([], true)
  async updateMemberRole(
    @Param('memberId') memberId: string,
    @Body() updateDTO: UpdateMemberRoleDTO,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log(
      { uid, memberId, updateDTO },
      'PUT /organisation/member/:memberId',
    )

    const membership = await this.organisationService.findOneMembership({
      where: { id: memberId },
      relations: ['organisation', 'organisation.owner', 'user'],
    })

    if (_isEmpty(membership)) {
      throw new NotFoundException(
        `Membership with ID ${memberId} does not exist`,
      )
    }

    await this.organisationService.validateManageAccess(
      membership.organisation,
      uid,
    )

    if (membership.user.id === uid) {
      throw new BadRequestException('You cannot modify your own role')
    }

    if (membership.role === OrganisationRole.owner) {
      throw new BadRequestException('Cannot modify owner role')
    }

    return this.organisationService.updateMembership(memberId, {
      role: updateDTO.role,
    })
  }

  @ApiBearerAuth()
  @Delete('/member/:memberId')
  @HttpCode(204)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @Auth([], true)
  async removeMember(
    @Param('memberId') memberId: string,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid, memberId }, 'DELETE /organisation/member/:memberId')

    const membership = await this.organisationService.findOneMembership({
      where: { id: memberId },
      relations: ['organisation', 'organisation.owner', 'user'],
    })

    if (_isEmpty(membership)) {
      throw new NotFoundException(
        `Membership with ID ${memberId} does not exist`,
      )
    }

    await this.organisationService.validateManageAccess(
      membership.organisation,
      uid,
    )

    if (membership.role === OrganisationRole.owner) {
      throw new BadRequestException('Cannot remove organisation owner')
    }

    await this.organisationService.deleteMembership(memberId)
  }
}
