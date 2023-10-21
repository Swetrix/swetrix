import { IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator'

export class GetCommentsQueryDto {
  @IsNumberString()
  @IsOptional()
  offset?: number

  @IsNumberString()
  @IsOptional()
  limit?: number

  @IsString()
  extensionId: string

  @IsString()
  @IsOptional()
  @IsUUID()
  userId?: string
}
