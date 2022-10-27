import { IsUUID, ValidateIf } from 'class-validator'

export class UninstallExtensionBodyDto {
  @IsUUID()
  @ValidateIf((_object, value) => Boolean(value))
  readonly projectId: string | null
}
