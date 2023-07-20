import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class CreateReplyCommentBodyDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  commentId: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string | null
}
