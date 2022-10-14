import { IsUUID, ValidateIf } from 'class-validator'

export class UninstallExtensionBodyDto {
  @IsUUID()
  @ValidateIf((_object, value) => value !== null)
  readonly projectId: string | null
}
