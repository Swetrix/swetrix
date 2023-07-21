import { IsUUID } from 'class-validator'

export class DeleteCommentParamDto {
  @IsUUID()
  commentId: string
}
