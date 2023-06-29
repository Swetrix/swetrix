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
} from '@nestjs/common'
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { UserService } from '../../user/user.service'
import { ExtensionsService } from '../extensions/extensions.service'
import { Auth, CurrentUserId } from '../../auth/decorators'
import { UserType } from '../../user/entities/user.entity'
import { CommentsService } from './comments.service'
import { CreateCommentBodyDto, ReplyCommentBodyDto } from './dtos/bodies/create-comment.dto'
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

  @Auth([UserType.CUSTOMER, UserType.ADMIN])
  @Post()
  @ApiQuery({ name: 'userId', required: true, type: String })
  async createComment(
    @Query() queries: CreateCommentQueryDto,
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
      throw new NotFoundException('Comment already exists.')
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

  @Auth([UserType.CUSTOMER])
  @Post(':commentId/reply')
  @ApiParam({ name: 'commentId', required: true, type: String })
  async replyToComment(
    @Param() params: GetCommentParamDto,
    @Body() body: ReplyCommentBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<Comment> {
    const comment = await this.commentsService.findOne({
      where: { id: params.commentId },
      relations: ['extension', 'extension.owner'],
    })

    if (!comment) {
      throw new NotFoundException('Comment not found.')
    }

    if (comment.extension.owner.id !== userId) {
      throw new ForbiddenException('You are not allowed to do this.')
    }

    if (comment.reply) {
      throw new ConflictException('Comment already has a reply.')
    }

    return await this.commentsService.update(comment.id, {
      reply: body.reply,
    })
  }
}
