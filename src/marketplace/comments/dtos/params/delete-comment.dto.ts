import { IsNumberString } from 'class-validator'

export class DeleteCommentParamDto {
  @IsNumberString()
  commentId: string
}
