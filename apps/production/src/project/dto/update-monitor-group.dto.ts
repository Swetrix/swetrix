import { ApiProperty } from '@nestjs/swagger'

export class UpdateMonitorGroupDto {
  @ApiProperty()
  name: string
}
