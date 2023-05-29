import { IntersectionType, PickType } from '@nestjs/mapped-types'
import { ProjectDTO } from './project.dto'
import { ProjectPasswordDto } from './project-password.dto'

export class UpdateProjectDto extends IntersectionType(
  PickType(ProjectDTO, [
    'id',
    'name',
    'origins',
    'ipBlacklist',
    'active',
    'public',
    'isCaptcha',
  ] as const),
  ProjectPasswordDto,
) {}
