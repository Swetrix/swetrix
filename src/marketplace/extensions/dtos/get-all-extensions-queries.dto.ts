import { IsNumberString, IsOptional, IsUUID } from 'class-validator'

export class GetAllExtensionsQueries {
  @IsNumberString()
  @IsOptional()
  readonly offset?: number

  @IsNumberString()
  @IsOptional()
  readonly limit?: number

  @IsUUID()
  @IsOptional()
  readonly ownerId?: string
}
