import { IsUUID } from 'class-validator'

export class InstallExtensionParamsDto {
  @IsUUID()
  readonly extensionId: string
}
