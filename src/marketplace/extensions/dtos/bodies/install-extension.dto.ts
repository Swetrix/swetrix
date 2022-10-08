import { IsUUID, ValidateIf } from 'class-validator'

export class InstallExtensionBodyDto {
  @IsUUID()
  @ValidateIf((_object, value) => value !== null)
  readonly projectId: string | null
}
