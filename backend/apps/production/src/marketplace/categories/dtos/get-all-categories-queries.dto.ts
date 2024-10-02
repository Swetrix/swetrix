import { IsNumberString, IsOptional } from 'class-validator'

export class GetAllCategoriesQueries {
  @IsNumberString()
  @IsOptional()
  readonly offset?: number

  @IsNumberString()
  @IsOptional()
  readonly limit?: number
}
