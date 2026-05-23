import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsOptional,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator'

export class CreateProjectDTO {
  @ApiProperty({
    example: 'Your awesome project',
    required: true,
    description: 'A display name for your project',
  })
  @IsNotEmpty()
  @Length(1, 50)
  name: string

  @ApiProperty({
    example: 'https://example.com',
    required: false,
    description:
      'Optional website URL. Used to display favicon and construct clickable page links.',
  })
  @IsOptional()
  @IsUrl({}, { message: 'websiteUrl must be a valid URL' })
  @MaxLength(512)
  websiteUrl?: string | null
}
