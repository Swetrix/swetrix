import { ValidateIf } from 'class-validator'

export class UninstallExtensionBodyDto {
  @ValidateIf((_object, value) => value !== undefined)
  readonly projectId: string | null
}
