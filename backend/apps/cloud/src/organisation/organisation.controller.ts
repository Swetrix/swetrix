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
} from '@nestjs/common'
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger'
import { isEmpty as _isEmpty, find as _find } from 'lodash'

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
  @Post('/')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
  @ApiResponse({ status: 200, type: Organisation })
  async create(
    @Body() createOrgDTO: CreateOrganisationDTO,
    @CurrentUserId() uid: string,
  ): Promise<Organisation> {
    this.logger.log({ uid, createOrgDTO }, 'POST /organisation')

    const user = await this.userService.findOne({ where: { id: uid } })

    return this.organisationService.create({
      name: createOrgDTO.name,
      owner: user,
    })
  }

  @ApiBearerAuth()
  @Post('/:orgId/invite')
  @HttpCode(200)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.CUSTOMER, UserType.ADMIN)
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
      relations: ['owner', 'members', 'members.user'],
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
