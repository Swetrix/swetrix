import { IsUUID } from 'class-validator'

export class GetCommentParamDto {
  @IsUUID()
  commentId: string
}
