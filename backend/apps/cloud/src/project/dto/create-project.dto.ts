import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsOptional,
  IsUrl,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator'
import { ProjectOrganisationDto } from './project-organisation.dto'

export class CreateProjectDTO extends ProjectOrganisationDto {
  @ApiProperty({
    example: 'Your awesome project',
    required: true,
    description: 'A display name for your project',
  })
  @IsNotEmpty()
  @Length(1, 50)
  name: string

  @ApiProperty({
    required: false,
  })
  public?: boolean

  @ApiProperty({
    required: false,
  })
  active?: boolean

  @ApiProperty({
    required: false,
  })
  isPasswordProtected?: boolean

  @ApiProperty({
    required: false,
  })
  password?: string

  @ApiProperty({
    required: false,
  })
  origins?: string[]

  @ApiProperty({
    required: false,
  })
  ipBlacklist?: string[]

  @ApiProperty({
    required: false,
  })
  ipWhitelist?: string[]

  @ApiProperty({
    required: false,
  })
  countryBlacklist?: string[]

  @ApiProperty({
    example: 'https://example.com',
    required: false,
    description:
      'Optional website URL. Used to display favicon and construct clickable page links.',
  })
  @IsOptional()
  @ValidateIf((o) => o.websiteUrl !== null && o.websiteUrl !== undefined)
  @IsUrl({}, { message: 'websiteUrl must be a valid URL' })
  @MaxLength(512)
  websiteUrl?: string | null
}
