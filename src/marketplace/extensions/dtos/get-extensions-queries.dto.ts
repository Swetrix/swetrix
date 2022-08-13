import { IsNumberString, IsOptional } from 'class-validator'

export class GetExtensionsQueries {
  @IsNumberString()
  @IsOptional()
  readonly offset?: number

  @IsNumberString()
  @IsOptional()
  readonly limit?: number
}
