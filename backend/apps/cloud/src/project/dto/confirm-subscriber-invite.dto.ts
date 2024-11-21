import { IsUUID, Matches } from 'class-validator'

export class ConfirmSubscriberInviteParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string
}

export class ConfirmSubscriberInviteQueriesDto {
  @IsUUID('4')
  readonly token: string
}
