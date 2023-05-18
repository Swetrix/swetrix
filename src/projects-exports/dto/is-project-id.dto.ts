import { Matches } from 'class-validator'

export class IsProjectIdDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/, { message: 'Invalid project ID.' })
  projectId: string
}
