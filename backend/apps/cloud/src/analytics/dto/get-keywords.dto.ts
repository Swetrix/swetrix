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
}
