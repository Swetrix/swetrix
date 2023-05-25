import { ApiProperty } from '@nestjs/swagger'
import { IsDateString } from 'class-validator'

export class CreateExportDto {
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  startDate: Date

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  endDate: Date
}
