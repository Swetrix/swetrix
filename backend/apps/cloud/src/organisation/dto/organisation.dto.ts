import { IsEmail, IsEnum, IsString, Length } from 'class-validator'
import { OrganisationRole } from '../entity/organisation-member.entity'

export class CreateOrganisationDTO {
  @IsString()
  @Length(1, 50)
  name: string
}

export class InviteMemberDTO {
  @IsEmail()
  email: string

  @IsEnum(OrganisationRole)
  role: OrganisationRole
}

export class UpdateMemberRoleDTO {
  @IsEnum(OrganisationRole)
  role: OrganisationRole
}
