import { IsString } from 'class-validator'

export class DeleteCommentParamDto {
  @IsString()
  commentId: string
}
