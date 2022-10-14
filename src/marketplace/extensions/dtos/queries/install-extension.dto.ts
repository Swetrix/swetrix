import { IsUUID } from 'class-validator'

export class InstallExtensionQueriesDto {
  @IsUUID()
  readonly userId: string
}
