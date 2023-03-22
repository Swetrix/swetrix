import { Matches, IsUUID } from 'class-validator'

export class RemoveSubscriberParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string

  @IsUUID('4')
  readonly subscriberId: string
}
