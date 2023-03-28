import { IsUUID, Matches } from 'class-validator'

export class ConfirmTransferProjectParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string
}

export class ConfirmTransferProjectQueriesDto {
  @IsUUID('4')
  readonly token: string
}
