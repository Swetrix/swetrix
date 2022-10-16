import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsString } from 'class-validator'

export class CreateComplaintBodyDto {
  @ApiProperty()
  @IsNumber()
  extensionId: number

  @ApiProperty()
  @IsString()
  description: string
}
