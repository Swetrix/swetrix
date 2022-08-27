import { IsNumberString, IsOptional, IsString } from 'class-validator'

export class SearchExtensionQueries {
  @IsString()
  readonly term!: string

  @IsNumberString()
  @IsOptional()
  readonly offset?: number

  @IsNumberString()
  @IsOptional()
  readonly limit?: number
}
