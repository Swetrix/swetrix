import { IsString } from 'class-validator'

export class GetCommentParamDto {
  @IsString()
  commentId: string
}
