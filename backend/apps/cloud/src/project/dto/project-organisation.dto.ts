import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class ProjectOrganisationDto {
  @ApiProperty({
    required: false,
  })
  @IsString()
  @IsOptional()
  organisationId?: string
}
