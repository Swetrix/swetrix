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
    'isCaptcha',
  ] as const),
  ProjectPasswordDto,
) {
  @ApiProperty({
    required: true,
    description:
      "The project's state. If enabled - all the incoming analytics data will be saved.",
  })
  @IsNotEmpty()
  active: boolean

  @ApiProperty({
    required: true,
    description:
      "When true, anyone on the internet (including Google) would be able to see the project's Dashboard.",
  })
  @IsNotEmpty()
  public: boolean
}
