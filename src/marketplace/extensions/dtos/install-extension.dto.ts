import { IsString } from 'class-validator'

export class InstallExtensionParams {
  @IsString()
  readonly extensionId!: string
}
