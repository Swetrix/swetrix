import { ValidateIf } from 'class-validator'

export class InstallExtensionBodyDto {
  @ValidateIf((_object, value) => value !== undefined)
  readonly projectId: string | null
}
