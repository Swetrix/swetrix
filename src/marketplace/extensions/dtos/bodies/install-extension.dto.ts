import { ValidateIf } from 'class-validator'

export class InstallExtensionBodyDto {
  @ValidateIf((_object, value) => Boolean(value))
  readonly projectId: string | null
}
