import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class RequestExportDTO {
  @ApiProperty({
    example: 'STEzHcB1rALV',
    required: true,
    description: 'The project ID you want to export raw data for',
  })
  @IsNotEmpty()
  pid: string

  @ApiProperty()
  @IsNotEmpty()
  from: string

  @ApiProperty()
  @IsNotEmpty()
  to: string
}
