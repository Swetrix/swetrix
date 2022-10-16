import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common'
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { CommentsService } from './comments.service'
import { DeleteCommentParamDto } from './dtos/params/delete-comment.dto'
import { GetCommentParamDto } from './dtos/params/get-comment.dto'
import { GetCommentsQueryDto } from './dtos/queries/get-comments.dto'
import { Comment } from './entities/comment.entity'

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiQuery({ name: 'offset', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'extensionId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async getComments(@Query() queries: GetCommentsQueryDto): Promise<{
    comments: Comment[]
    count: number
  }> {
    const [comments, count] = await this.commentsService.findAndCount({
      where: {
        ...(queries.extensionId && { extensionId: queries.extensionId }),
        ...(queries.userId && { userId: queries.userId }),
      },
      skip: queries.offset || 0,
      take: queries.limit || 25,
    })

    return { comments, count }
  }

  @Get(':commentId')
  @ApiParam({ name: 'commentId', required: true, type: String })
  async getComment(@Param() params: GetCommentParamDto): Promise<Comment> {
    const comment = await this.commentsService.findOne({
      where: { id: params.commentId },
    })

    if (!comment) {
      throw new NotFoundException('Comment not found.')
    }

    return comment
  }

  @Delete(':commentId')
  @ApiParam({ name: 'commentId', required: true, type: String })
  async deleteComment(@Param() params: DeleteCommentParamDto): Promise<void> {
    const comment = await this.commentsService.findOne({
      where: { id: params.commentId },
    })

    if (!comment) {
      throw new NotFoundException('Comment not found.')
    }

    await this.commentsService.delete(params.commentId)
  }
}
