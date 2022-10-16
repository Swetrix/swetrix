import { ApiProperty } from '@nestjs/swagger'
import { IsNumberString } from 'class-validator'

export class CreateCommentQueryDto {
  @ApiProperty()
  @IsNumberString()
  userId: string
}
