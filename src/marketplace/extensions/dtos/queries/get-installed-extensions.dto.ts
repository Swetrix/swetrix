import { IsUUID } from 'class-validator'

export class GetInstalledExtensionsQueriesDto {
  @IsUUID()
  readonly userId: string
}
