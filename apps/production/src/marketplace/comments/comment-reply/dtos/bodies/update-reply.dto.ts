import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateCommentReplyBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string | null
}
