import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { UserService } from '../../user/user.service'
import { ExtensionsService } from '../extensions/extensions.service'
import { CommentsService } from './comments.service'
import { CreateCommentBodyDto } from './dtos/bodies/create-comment.dto'
import { DeleteCommentParamDto } from './dtos/params/delete-comment.dto'
import { GetCommentParamDto } from './dtos/params/get-comment.dto'
import { CreateCommentQueryDto } from './dtos/queries/create-comment.dto'
import { GetCommentsQueryDto } from './dtos/queries/get-comments.dto'
import { Comment } from './entities/comment.entity'

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly extensionsService: ExtensionsService,
    private readonly userService: UserService,
  ) {}

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

  @Post()
  @ApiQuery({ name: 'userId', required: true, type: String })
  async createComment(
    @Query() queries: CreateCommentQueryDto,
    @Body() body: CreateCommentBodyDto,
  ): Promise<Comment> {
    const extension = await this.extensionsService.findOne({
      where: { id: body.extensionId },
    })

    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    const user = await this.userService.findOne(queries.userId)

    if (!user) {
      throw new NotFoundException('User not found.')
    }

    const comment = await this.commentsService.findOne({
      where: { extensionId: body.extensionId, userId: queries.userId },
    })

    if (comment) {
      throw new NotFoundException('Comment already exists.')
    }

    return await this.commentsService.save({
      ...body,
      extensionId: Number(body.extensionId),
      userId: Number(queries.userId),
    })
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
