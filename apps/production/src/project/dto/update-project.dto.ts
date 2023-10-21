import { IntersectionType, PartialType } from '@nestjs/mapped-types'
import { ApiProperty } from '@nestjs/swagger'
import { ProjectDTO } from './project.dto'
import { ProjectPasswordDto } from './project-password.dto'

export class UpdateProjectDto extends IntersectionType(
  PartialType(ProjectDTO),
  ProjectPasswordDto,
) {
  @ApiProperty({
    required: false,
    description:
      "The project's state. If enabled - all the incoming analytics data will be saved.",
  })
  active?: boolean

  @ApiProperty({
    required: false,
    description:
      "When true, anyone on the internet (including Google) would be able to see the project's Dashboard.",
  })
  public?: boolean
}
