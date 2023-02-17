import { IsNumberString, IsOptional, IsString } from 'class-validator'

export class GetCommentsQueryDto {
  @IsNumberString()
  @IsOptional()
  offset?: number

  @IsNumberString()
  @IsOptional()
  limit?: number

  @IsString()
  @IsOptional()
  extensionId: string

  @IsString()
  @IsOptional()
  userId?: string
}
