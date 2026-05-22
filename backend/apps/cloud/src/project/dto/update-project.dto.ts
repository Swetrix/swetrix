import { IsBoolean, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator'
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
      'CAPTCHA PoW difficulty (number of leading zeros required). Higher = harder. Range: 2-6.',
    default: 4,
    minimum: 2,
    maximum: 6,
  })
  @IsInt()
  @Min(2)
  @Max(6)
  @IsOptional()
  captchaDifficulty?: number

  @ApiProperty({
    required: false,
    description:
      'CAPTCHA difficulty mode. Manual uses captchaDifficulty directly; auto selects difficulty dynamically from risk signals.',
    enum: ['manual', 'auto'],
    default: 'manual',
  })
  @IsIn(['manual', 'auto'])
  @IsOptional()
  captchaDifficultyMode?: 'manual' | 'auto'
}
