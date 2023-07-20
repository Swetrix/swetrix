import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CommentsService } from '../comments.service'
import { CommentReply } from './entities/comment-reply.entity'
import { CreateReplyCommentBodyDto } from './dtos/bodies/create-reply.dto'
import { UpdateCommentReplyBodyDto } from './dtos/bodies/update-reply.dto'

@Injectable()
export class CommentReplyService {
  constructor(
    @InjectRepository(CommentReply)
    private readonly commentReplyRepository: Repository<CommentReply>,
    private readonly commentsService: CommentsService,
  ) {}

  async createCommentReply(
    commentReplyDto: CreateReplyCommentBodyDto,
    userId: string,
  ): Promise<CommentReply> {
    const comment = await this.commentsService.findOne({
      where: { id: commentReplyDto.commentId },
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    const commentReply = this.commentReplyRepository.create({
      text: commentReplyDto.text,
      parentComment: comment,
      userId,
    })
    return this.commentReplyRepository.save(commentReply)
  }

  async findAllCommentReplies(commetId: string): Promise<CommentReply[]> {
    return this.commentReplyRepository.find({
      where: { parentComment: { id: commetId } },
    })
  }

  async findCommentReplyById(id: string): Promise<CommentReply | undefined> {
    return this.commentReplyRepository.findOne(id)
  }

  async updateCommentReply(
    id: string,
    commentReplyDto: UpdateCommentReplyBodyDto,
  ): Promise<CommentReply | undefined> {
    await this.commentReplyRepository.update(id, commentReplyDto)
    return this.commentReplyRepository.findOne(id)
  }

  async deleteCommentReply(id: string): Promise<void> {
    await this.commentReplyRepository.delete(id)
  }
}
