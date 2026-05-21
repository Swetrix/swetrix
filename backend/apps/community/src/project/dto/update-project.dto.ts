import { IntersectionType, PartialType } from '@nestjs/mapped-types'
import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'
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
    description: 'CAPTCHA difficulty level (2-6). Higher = harder for bots.',
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
