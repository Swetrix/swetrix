import { IsBoolean, IsOptional, IsInt, Min, Max } from 'class-validator'
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

  @ApiProperty({
    required: false,
    description:
      'When true, the incoming data will not be gathered for this project',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean

  @ApiProperty({
    required: false,
    description:
      'CAPTCHA PoW difficulty (number of leading zeros required). Higher = harder. Range: 1-6.',
    default: 4,
    minimum: 1,
    maximum: 6,
  })
  @IsInt()
  @Min(1)
  @Max(6)
  @IsOptional()
  captchaDifficulty?: number
}
