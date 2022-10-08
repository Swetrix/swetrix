import { IsUUID } from 'class-validator'

export class UninstallExtensionQueriesDto {
  @IsUUID()
  readonly userId: string
}
