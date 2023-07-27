import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class GetFiltersDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  pid: string

  @ApiProperty({
    example: 'br',
    required: true,
    description: 'Params type. Example: br, os, cc, etc.',
  })
  @IsNotEmpty()
  type: string
}
