import { IsNumberString, IsOptional, Matches } from 'class-validator'

export class GetSubscribersParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string
}

export class GetSubscribersQueriesDto {
  @IsOptional()
  @IsNumberString()
  readonly offset?: string

  @IsOptional()
  @IsNumberString()
  readonly limit?: string
}
