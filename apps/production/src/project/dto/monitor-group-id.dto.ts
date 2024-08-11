import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsUUID } from 'class-validator'

export class MonitorGroupIdDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  readonly monitorGroupId: string
}
