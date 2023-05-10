import { IsNumberString, IsOptional, Matches } from 'class-validator'

export class GetAnnotationsParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string
}

export class GetAnnotationsQueriesDto {
  @IsOptional()
  @IsNumberString()
  readonly offset?: string

  @IsOptional()
  @IsNumberString()
  readonly limit?: string
}
