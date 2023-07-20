import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common'
import * as _map from 'lodash/map'
import * as _isEmpty from 'lodash/isEmpty'
import { UserService } from '../../../user/user.service'
import { CommentReplyService } from './comment-reply.service'
import { CreateReplyCommentBodyDto } from './dtos/bodies/create-reply.dto'
import { UpdateCommentReplyBodyDto } from './dtos/bodies/update-reply.dto'
import { CommentReply } from './entities/comment-reply.entity'
import { Auth, CurrentUserId } from '../../../auth/decorators'
import { UserType } from '../../../user/entities/user.entity'

@Controller('comment-reply')
export class CommentReplyController {
  constructor(
    private readonly commentReplyService: CommentReplyService,
    private readonly userService: UserService,
  ) {}

  @Auth([UserType.ADMIN, UserType.CUSTOMER])
  @Post()
  async createCommentReply(
    @Body() commentReplyDto: CreateReplyCommentBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<CommentReply> {
    return this.commentReplyService.createCommentReply(commentReplyDto, userId)
  }

  @Auth([UserType.ADMIN, UserType.CUSTOMER], false, true)
  @Get()
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

    const commentReplies = await this.commentReplyService.findAllCommentReplies(
      commetId,
    )

    if (!_isEmpty(user)) {
      return _map(commentReplies, commentReply => ({
        ...commentReply,
        isOwner: commentReply.userId === userId,
      }))
    }

    return _map(commentReplies, commentReply => ({
      ...commentReply,
      isOwner: false,
    }))
  }

  @Auth([UserType.ADMIN, UserType.CUSTOMER], false, true)
  @Get(':id')
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

    const commentReply = await this.commentReplyService.findCommentReplyById(id)

    if (!commentReply) {
      throw new Error('Comment reply not found')
    }

    if (!_isEmpty(user)) {
      return {
        ...commentReply,
        isOwner: commentReply.userId === userId,
      }
    }

    return {
      ...commentReply,
      isOwner: false,
    }
  }

  @Put(':id')
  async updateCommentReply(
    @Param('id') id: string,
    @Body() commentReplyDto: UpdateCommentReplyBodyDto,
  ): Promise<CommentReply | undefined> {
    return this.commentReplyService.updateCommentReply(id, commentReplyDto)
  }

  @Delete(':id')
  async deleteCommentReply(@Param('id') id: string): Promise<void> {
    return this.commentReplyService.deleteCommentReply(id)
  }
}
