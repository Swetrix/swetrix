import { ApiProperty } from '@nestjs/swagger'
import { IsNumberString } from 'class-validator'

export class CreateComplaintQueryDto {
  @ApiProperty()
  @IsNumberString()
  userId: string
}
