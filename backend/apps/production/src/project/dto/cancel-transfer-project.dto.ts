import { IsUUID } from 'class-validator'

export class CancelTransferProjectQueriesDto {
  @IsUUID('4')
  readonly token: string
}
