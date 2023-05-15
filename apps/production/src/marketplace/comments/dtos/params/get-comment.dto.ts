import { IsNumberString } from 'class-validator'

export class GetCommentParamDto {
  @IsNumberString()
  commentId: string
}
