import {
  Body,
  Controller,
  ConflictException,
  ForbiddenException,
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
import * as _isEmpty from 'lodash/isEmpty'
import * as _map from 'lodash/map'
import * as _includes from 'lodash/includes'
import * as _omit from 'lodash/omit'
import { UserService } from '../../user/user.service'
import { ExtensionsService } from '../extensions/extensions.service'
import { Auth, CurrentUserId } from '../../auth/decorators'
import { UserType } from '../../user/entities/user.entity'
import { CommentsService } from './comments.service'
import { CreateCommentBodyDto } from './dtos/bodies/create-comment.dto'
import { DeleteCommentParamDto } from './dtos/params/delete-comment.dto'
import { GetCommentParamDto } from './dtos/params/get-comment.dto'
import { GetCommentsQueryDto } from './dtos/queries/get-comments.dto'
import { Comment } from './entities/comment.entity'
import { CommentReply } from './entities/comment-reply.entity'
import { CreateReplyCommentBodyDto } from './dtos/bodies/create-reply.dto'
import { UpdateCommentReplyBodyDto } from './dtos/bodies/update-reply.dto'

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
    @CurrentUserId() userId: string,
  ): Promise<{
    comments: Comment[] & { isOwner?: boolean }
    count: number
  }> {
    let user

    try {
      user = await this.userService.findOne(userId)
    } catch (error) {
      user = undefined
    }

    const [comments, count] = await this.commentsService.findAndCount({
      where: {
        ...(queries.extensionId && { extensionId: queries.extensionId }),
        ...(userId && { userId }),
      },
      skip: queries.offset || 0,
      take: queries.limit || 25,
      relations: ['replies'],
    })

    if (!_isEmpty(user)) {
      return {
        comments: _map(comments, comment => ({
          ..._omit(comment, ['userId']),
          isOwner: comment.userId === userId,
        })),
        count,
      }
    }

    return {
      comments: _map(comments, comment => ({
        ..._omit(comment, ['userId']),
        isOwner: false,
      })),
      count,
    }
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

    return _omit(comment, ['userId'])
  }

  @Auth([UserType.CUSTOMER, UserType.ADMIN])
  @Post()
  @ApiQuery({ name: 'userId', required: true, type: String })
  async createComment(
    @Body() body: CreateCommentBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<Comment> {
    const extension = await this.extensionsService.findOne({
      where: { id: body.extensionId },
      relations: ['owner'],
    })

    if (!extension) {
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

    if (!user.roles.includes(UserType.ADMIN)) {
      if (comment.user.id !== userId) {
        throw new ForbiddenException('You are not allowed to do this.')
      }
    }

    await this.commentsService.delete(params.commentId)
  }

  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  @Post('reply')
  async createCommentReply(
    @Body() commentReplyDto: CreateReplyCommentBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<CommentReply & { isOwner?: boolean }> {
    const replyComment = await this.commentsService.createCommentReply(
      commentReplyDto,
      userId,
    )

    return {
      ...replyComment,
      parentComment: _omit(replyComment.parentComment, ['userId']),
      isOwner: replyComment.userId === userId,
    }
  }

  @Auth([], true, true)
  @Get('reply')
  async findAllCommentReplies(
    @Param('id') commetId: string,
    @CurrentUserId() userId: string,
  ): Promise<(CommentReply & { isOwner: boolean })[]> {
    let user

    try {
      user = await this.userService.findOne(userId)
    } catch (error) {
      user = undefined
    }

    const commentReplies = await this.commentsService.findAllCommentReplies(
      commetId,
    )

    if (!_isEmpty(user)) {
      return _map(commentReplies, commentReply => ({
        ...commentReply,
        parentComment: _omit(commentReply.parentComment, ['userId']),
        isOwner: commentReply.userId === userId,
      }))
    }

    return _map(commentReplies, commentReply => ({
      ...commentReply,
      parentComment: _omit(commentReply.parentComment, ['userId']),
      isOwner: false,
    }))
  }

  @Auth([], true, true)
  @Get('reply/:id')
  async findCommentReplyById(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ): Promise<CommentReply & { isOwner: boolean }> {
    let user

    try {
      user = await this.userService.findOne(userId)
    } catch (error) {
      user = undefined
    }

    const commentReply = await this.commentsService.findCommentReplyById(id)

    if (!commentReply) {
      throw new NotFoundException('Comment reply not found.')
    }

    if (!_isEmpty(user)) {
      return {
        ...commentReply,
        parentComment: _omit(commentReply.parentComment, ['userId']),
        isOwner: commentReply.userId === userId,
      }
    }

    return {
      ...commentReply,
      parentComment: _omit(commentReply.parentComment, ['userId']),
      isOwner: false,
    }
  }

  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  @Put('reply/:id')
  async updateCommentReply(
    @Param('id') id: string,
    @Body() commentReplyDto: UpdateCommentReplyBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<CommentReply & { isOwner: boolean }> {
    const updatedReplyComment = await this.commentsService.updateCommentReply(
      id,
      commentReplyDto,
      userId,
    )

    return {
      ...updatedReplyComment,
      parentComment: _omit(updatedReplyComment.parentComment, ['userId']),
      isOwner: updatedReplyComment.userId === userId,
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
      !(commentReply.userId === userId || _includes(user.roles, UserType.ADMIN))
    ) {
      throw new ForbiddenException('You are not allowed to do this.')
    }

    await this.commentsService.deleteCommentReply(id)
  }
}
