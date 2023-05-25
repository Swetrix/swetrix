import { ApiProperty } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

export class ExportIdDto {
  @ApiProperty()
  @IsUUID('4', { message: 'Invalid export ID.' })
  exportId: string
}
