import {
  Body,
  Controller,
  ConflictException,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Put,
  BadRequestException,
} from '@nestjs/common'
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import * as _includes from 'lodash/includes'
import * as _omit from 'lodash/omit'
import { UserService } from '../../user/user.service'
import { ExtensionsService } from '../extensions/extensions.service'
import { Auth, CurrentUserId } from '../../auth/decorators'
import { UserType } from '../../user/entities/user.entity'
import { CommentsService } from './comments.service'
import { CreateCommentBodyDto } from './dtos/bodies/create-comment.dto'
import { DeleteCommentParamDto } from './dtos/params/delete-comment.dto'
import { GetCommentsQueryDto } from './dtos/queries/get-comments.dto'
import { Comment } from './entities/comment.entity'
import { CommentReply } from './entities/comment-reply.entity'
import { CreateReplyCommentBodyDto } from './dtos/bodies/create-reply.dto'
import { UpdateCommentReplyBodyDto } from './dtos/bodies/update-reply.dto'

interface IGetComments {
  comments: Comment[]
  count: number
}

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly extensionsService: ExtensionsService,
    private readonly userService: UserService,
  ) {}

  @Auth([], true, true)
  @Get()
  @ApiQuery({ name: 'offset', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'extensionId', required: false, type: String })
  async getComments(
    @Query() queries: GetCommentsQueryDto,
  ): Promise<IGetComments> {
    const [comments, count] = await this.commentsService.getCommentsByExtId(
      queries.extensionId,
      Number(queries.offset) || 0,
      Number(queries.limit) || 25,
    )

    return {
      comments,
      count,
    }
  }

  @Auth([UserType.CUSTOMER, UserType.ADMIN])
  @Post()
  @ApiQuery({ name: 'userId', required: true, type: String })
  async createComment(
    @Body() body: CreateCommentBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<Comment> {
    const user = await this.userService.findOne(userId)

    if (!user) {
      throw new NotFoundException('User not found.')
    }

    if (!user.nickname) {
      throw new BadRequestException('You must have a nickname to comment.')
    }

    const extension = await this.extensionsService.findOne({
      where: { id: body.extensionId },
      relations: ['owner'],
    })

    if (!extension || !extension.owner) {
      throw new NotFoundException('Extension not found.')
    }

    if (extension.owner.id === userId) {
      throw new ConflictException('You cannot comment on your own extension.')
    }

    const comment = await this.commentsService.findOne({
      where: { extensionId: body.extensionId, userId },
    })

    if (comment) {
      throw new BadRequestException(
        'You have already commented on this extension.',
      )
    }

    return this.commentsService.save({
      ...body,
      extensionId: extension.id,
      userId,
    })
  }

  @Auth([UserType.CUSTOMER, UserType.ADMIN])
  @Delete(':commentId')
  @ApiParam({ name: 'commentId', required: true, type: String })
  async deleteComment(
    @Param() params: DeleteCommentParamDto,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    const comment = await this.commentsService.findOne({
      where: { id: params.commentId },
      relations: ['user', 'extension', 'extension.owner'],
    })

    if (!comment) {
      throw new NotFoundException('Comment not found.')
    }

    const user = await this.userService.findOne(userId)

    if (!_includes(user.roles, UserType.ADMIN) && comment.user.id !== userId) {
      throw new ConflictException('You are not allowed to do this.')
    }

    await this.commentsService.delete(params.commentId)
  }

  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  @Post('reply')
  async createCommentReply(
    @Body() commentReplyDto: CreateReplyCommentBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<CommentReply & { isOwner?: boolean }> {
    const user = await this.userService.findOne(userId)

    if (!user) {
      throw new NotFoundException('User not found.')
    }

    if (!user.nickname) {
      throw new BadRequestException('You must have a nickname to reply.')
    }

    const comment = await this.commentsService.findOne({
      where: { id: commentReplyDto.commentId },
    })

    if (!comment) {
      throw new NotFoundException('Comment not found')
    }

    const hasUserReplied = await this.commentsService.haveUserRepliedToComment(
      comment.id,
      userId,
    )

    if (hasUserReplied) {
      throw new BadRequestException('You have already replied to this comment')
    }

    const replyComment = await this.commentsService.createCommentReply(
      commentReplyDto,
      comment,
      userId,
    )

    return {
      ...replyComment,
      parentComment: _omit(replyComment.parentComment, ['userId']),
      isOwner: true,
    }
  }

  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  @Put('reply/:id')
  async updateCommentReply(
    @Param('id') id: string,
    @Body() commentReplyDto: UpdateCommentReplyBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<CommentReply & { isOwner: boolean }> {
    const commentReply = await this.commentsService.findCommentReplyById(id)

    if (!commentReply) {
      throw new NotFoundException('Comment reply not found')
    }

    if (commentReply.user.id !== userId) {
      throw new BadRequestException(
        'You are not the owner of this comment reply',
      )
    }

    const updatedReplyComment = await this.commentsService.updateCommentReply(
      id,
      commentReplyDto,
    )

    return {
      ...updatedReplyComment,
      isOwner: updatedReplyComment.user.id === userId,
    }
  }

  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  @Delete('reply/:id')
  async deleteCommentReply(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    const commentReply = await this.commentsService.findCommentReplyById(id)

    if (!commentReply) {
      throw new NotFoundException('Comment reply not found.')
    }

    const user = await this.userService.findOne(userId)

    if (
      !(
        commentReply.user.id === userId || _includes(user.roles, UserType.ADMIN)
      )
    ) {
      throw new ConflictException('You are not allowed to do this.')
    }

    await this.commentsService.deleteCommentReply(id)
  }
}
