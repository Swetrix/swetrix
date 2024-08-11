import { ApiProperty } from '@nestjs/swagger'

export class CreateMonitorGroupDto {
  @ApiProperty()
  name: string
}
