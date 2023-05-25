import { ApiProperty } from '@nestjs/swagger'
import { Matches } from 'class-validator'

export class ProjectIdDto {
  @ApiProperty()
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/, { message: 'Invalid project ID.' })
  projectId: string
}
