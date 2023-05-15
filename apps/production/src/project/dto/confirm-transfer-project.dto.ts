import { IsUUID } from 'class-validator'

export class ConfirmTransferProjectQueriesDto {
  @IsUUID('4')
  readonly token: string
}
