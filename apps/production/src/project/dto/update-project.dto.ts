import { IntersectionType, PickType } from '@nestjs/mapped-types'
import { IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { ProjectDTO } from './project.dto'
import { ProjectPasswordDto } from './project-password.dto'

export class UpdateProjectDto extends IntersectionType(
  PickType(ProjectDTO, [
    'id',
    'name',
    'origins',
    'ipBlacklist',
    'public',
    'isCaptcha',
  ] as const),
  ProjectPasswordDto,
) {
  @ApiProperty({
    required: false,
    description:
      "The project's state. If enabled - all the incoming analytics data will be saved.",
  })
  @IsNotEmpty()
  active: boolean
}
