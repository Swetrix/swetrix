import { IsUUID, ValidateIf } from 'class-validator'

export class InstallExtensionBodyDto {
  @IsUUID()
  @ValidateIf((_object, value) => Boolean(value))
  readonly projectId: string | null
}
