import { IsOptional, IsString } from 'class-validator'

export class GetKeywordsDto {
  @IsString()
  pid: string

  @IsString()
  period: string

  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsString()
  timeBucket?: string

  @IsOptional()
  @IsString()
  filters?: string

  @IsOptional()
  @IsString()
  page?: string

  @IsOptional()
  @IsString()
  query?: string
}
