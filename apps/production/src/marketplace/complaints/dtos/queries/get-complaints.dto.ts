import { IsNumberString, IsOptional } from 'class-validator'

export class GetComplaintsQueryDto {
  @IsNumberString()
  @IsOptional()
  offset?: number

  @IsNumberString()
  @IsOptional()
  limit?: number

  @IsNumberString()
  @IsOptional()
  extensionId?: number

  @IsNumberString()
  @IsOptional()
  userId?: number
}
