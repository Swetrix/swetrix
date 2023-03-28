import { IsUUID, Matches } from 'class-validator'

export class CancelTransferProjectParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string
}

export class CancelTransferProjectQueriesDto {
  @IsUUID('4')
  readonly token: string
}
