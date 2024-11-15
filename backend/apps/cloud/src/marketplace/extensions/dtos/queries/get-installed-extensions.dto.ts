import { IsNumberString, IsOptional } from 'class-validator'

export class GetInstalledExtensionsQueriesDto {
  @IsNumberString()
  @IsOptional()
  readonly offset?: number

  @IsNumberString()
  @IsOptional()
  readonly limit?: number
}
