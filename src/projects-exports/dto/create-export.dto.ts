import { ApiProperty } from '@nestjs/swagger'
import { IsDateString } from 'class-validator'

export class CreateExportDto {
  @ApiProperty()
  @IsDateString({ strict: true })
  startDate: Date

  @ApiProperty()
  @IsDateString({ strict: true })
  endDate: Date
}
