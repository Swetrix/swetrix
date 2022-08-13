import { IsNumberString, IsOptional } from 'class-validator'

export class GetAllExtensionsQueries {
  @IsNumberString()
  @IsOptional()
  readonly offset?: number

  @IsNumberString()
  @IsOptional()
  readonly limit?: number
}
