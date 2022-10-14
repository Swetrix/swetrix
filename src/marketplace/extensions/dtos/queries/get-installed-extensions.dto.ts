import { IsNumberString, IsOptional, IsUUID } from 'class-validator'

export class GetInstalledExtensionsQueriesDto {
  @IsUUID()
  readonly userId: string

  @IsNumberString()
  @IsOptional()
  readonly offset?: number

  @IsNumberString()
  @IsOptional()
  readonly limit?: number
}
