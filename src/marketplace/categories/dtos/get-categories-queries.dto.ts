import { IsNumberString, IsOptional } from 'class-validator'

export class GetCategoriesQueries {
  @IsNumberString()
  @IsOptional()
  readonly offset?: number

  @IsNumberString()
  @IsOptional()
  readonly limit?: number
}
