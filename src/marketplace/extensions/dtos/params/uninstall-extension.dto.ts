import { IsUUID } from 'class-validator'

export class UninstallExtensionParamsDto {
  @IsUUID()
  readonly extensionId: string
}
