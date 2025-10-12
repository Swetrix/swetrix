import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
  HttpCode,
  Headers,
  Get,
  Query,
  ForbiddenException,
  Patch,
  ParseIntPipe,
  Ip,
} from '@nestjs/common'
import { ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger'
import { isEmpty as _isEmpty, find as _find, trim as _trim } from 'lodash'

import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
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
  UpdateOrganisationDTO,
} from './dto/organisation.dto'
import { OrganisationRole } from './entity/organisation-member.entity'
import { AppLoggerService } from '../logger/logger.service'
import { LetterTemplate } from '../mailer/letter'
import { Auth } from '../auth/decorators'
import { Pagination } from '../common/pagination'
import { ProjectService } from '../project/project.service'
import { Project } from '../project/entity'
import { isDevelopment, PRODUCTION_ORIGIN } from '../common/constants'
import { checkRateLimit, getIPFromHeaders } from '../common/utils'

const ORGANISATION_INVITE_EXPIRE = 7 * 24 // 7 days in hours

@Controller('organisation')
export class OrganisationController {
  constructor(
    private readonly organisationService: OrganisationService,
    private readonly userService: UserService,
    private readonly mailerService: MailerService,
    private readonly actionTokensService: ActionTokensService,
    private readonly logger: AppLoggerService,
    private readonly projectService: ProjectService,
  ) {}

  @ApiBearerAuth()
  @Get('/')
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, type: [Organisation] })
  @Auth(true)
  async get(
    @CurrentUserId() userId: string,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('search') search?: string,
  ): Promise<Pagination<Organisation> | Organisation[] | object> {
    this.logger.log({ userId, take, skip }, 'GET /organisation')

    return this.organisationService.paginate({ take, skip }, userId, search)
  }

  @ApiBearerAuth()
  @Get('/:orgId')
  @ApiResponse({ status: 200, type: Organisation })
  @Auth(true)
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
  @Auth()
  @ApiResponse({ status: 200, type: Organisation })
  @Auth(true)
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
      confirmed: true,
    })

    return organisation
  }

  @ApiBearerAuth()
  @Post('/:orgId/invite')
  @HttpCode(200)
  @Auth()
  @Auth(true)
  async inviteMember(
    @Param('orgId') orgId: string,
    @Body() inviteDTO: InviteMemberDTO,
    @CurrentUserId() userId: string,
    @Headers() headers,
    @Ip() reqIP,
  ): Promise<Organisation> {
    this.logger.log(
      { userId, orgId, inviteDTO },
      'POST /organisation/:orgId/invite',
    )

    const ip = getIPFromHeaders(headers) || reqIP || ''
    await checkRateLimit(ip, 'org-invite', 5, 1800)
    await checkRateLimit(userId, 'org-invite', 5, 1800)

    const user = await this.userService.findOne({ where: { id: userId } })
    const organisation = await this.organisationService.findOne({
      where: { id: orgId },
      relations: ['members', 'members.user'],
    })

    if (_isEmpty(organisation)) {
      throw new NotFoundException(
        `Organisation with ID ${orgId} does not exist`,
      )
    }

    this.organisationService.validateManageAccess(organisation, userId)

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

    // if (!this.userService.isPaidTier(invitee)) {
    //   throw new BadRequestException(
    //     'You must be a paid tier subscriber to use this feature.',
    //   )
    // }

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
  @Patch('/member/:memberId')
  @HttpCode(200)
  @Auth()
  @Auth(true)
  async updateMemberRole(
    @Param('memberId') memberId: string,
    @Body() updateDTO: UpdateMemberRoleDTO,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log(
      { uid, memberId, updateDTO },
      'PATCH /organisation/member/:memberId',
    )

    const membership = await this.organisationService.findOneMembership({
      where: { id: memberId },
      relations: [
        'organisation',
        'organisation.members',
        'organisation.members.user',
        'user',
      ],
    })

    if (_isEmpty(membership)) {
      throw new NotFoundException(
        `Membership with ID ${memberId} does not exist`,
      )
    }

    this.organisationService.validateManageAccess(membership.organisation, uid)

    if (membership.user.id === uid) {
      throw new BadRequestException('You cannot modify your own role')
    }

    if (
      membership.role === OrganisationRole.owner ||
      updateDTO.role === OrganisationRole.owner
    ) {
      throw new BadRequestException('Cannot modify owner role')
    }

    return this.organisationService.updateMembership(memberId, {
      role: updateDTO.role,
    })
  }

  @ApiBearerAuth()
  @Delete('/member/:memberId')
  @HttpCode(204)
  @Auth()
  @Auth(true)
  async removeMember(
    @Param('memberId') memberId: string,
    @CurrentUserId() uid: string,
  ) {
    this.logger.log({ uid, memberId }, 'DELETE /organisation/member/:memberId')

    const membership = await this.organisationService.findOneMembership({
      where: { id: memberId },
      relations: [
        'organisation',
        'organisation.members',
        'organisation.members.user',
        'user',
      ],
    })

    if (_isEmpty(membership)) {
      throw new NotFoundException(
        `Membership with ID ${memberId} does not exist`,
      )
    }

    this.organisationService.validateManageAccess(membership.organisation, uid)

    if (membership.role === OrganisationRole.owner) {
      throw new BadRequestException('Cannot remove organisation owner')
    }

    await this.organisationService.deleteMembership(memberId)
  }

  @ApiBearerAuth()
  @Delete('/:orgId')
  @ApiResponse({ status: 200, type: Organisation })
  @Auth(true)
  async delete(@Param('orgId') orgId: string, @CurrentUserId() userId: string) {
    this.logger.log({ orgId, userId }, 'DELETE /organisation/:orgId')

    const isOwner = await this.organisationService.isOrganisationOwner(
      orgId,
      userId,
    )

    if (!isOwner) {
      throw new ForbiddenException(
        'You must be the organisation owner to delete it',
      )
    }

    try {
      await this.projectService.update({ organisation: { id: orgId } }, {
        organisation: null,
      } as Project)
      await this.organisationService.deleteMemberships({
        organisation: { id: orgId },
      })
      await this.organisationService.delete(orgId)
    } catch (reason) {
      console.error('[ERROR] Failed to delete organisation:', reason)
      throw new BadRequestException('Failed to delete organisation')
    }
  }

  @ApiBearerAuth()
  @Patch('/:orgId')
  @ApiResponse({ status: 200, type: Organisation })
  @Auth(true)
  async update(
    @Param('orgId') orgId: string,
    @Body() updateOrgDTO: UpdateOrganisationDTO,
    @CurrentUserId() userId: string,
  ) {
    this.logger.log(
      { orgId, updateOrgDTO, userId },
      'PATCH /organisation/:orgId',
    )

    const canManage = await this.organisationService.canManageOrganisation(
      orgId,
      userId,
    )

    if (!canManage) {
      throw new ForbiddenException(
        'You do not have permission to manage this organisation',
      )
    }

    try {
      await this.organisationService.update(orgId, {
        name: _trim(updateOrgDTO.name),
      })
    } catch (reason) {
      console.error('[ERROR] Failed to update organisation:', reason)
      throw new BadRequestException('Failed to update organisation')
    }
  }
}
