import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator'
import { SortByExtension } from '../enums/sort-by-extension.enum'

export class SearchExtensionQueries {
  @IsString()
  readonly term!: string

  @IsString()
  @IsOptional()
  readonly category!: string

  @IsEnum(SortByExtension)
  @IsOptional()
  readonly sortBy?: SortByExtension

  @IsNumberString()
  @IsOptional()
  readonly offset?: number

  @IsNumberString()
  @IsOptional()
  readonly limit?: number
}
