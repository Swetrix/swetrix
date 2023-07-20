import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm'
import { Comment } from './entities/comment.entity'
import { CreateReplyCommentBodyDto } from './dtos/bodies/create-reply.dto'
import { UpdateCommentReplyBodyDto } from './dtos/bodies/update-reply.dto'
import { CommentReply } from './entities/comment-reply.entity'

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(CommentReply)
    private commentReplyRepository: Repository<CommentReply>,
  ) {}

  async findAndCount(
    options: FindManyOptions<Comment>,
  ): Promise<[Comment[], number]> {
    return this.commentsRepository.findAndCount({ ...options })
  }

  async findOne(options: FindOneOptions<Comment>): Promise<Comment> {
    return this.commentsRepository.findOne({ ...options })
  }

  async save(comment: Partial<Comment>): Promise<Comment> {
    return this.commentsRepository.save(comment)
  }

  async delete(id: string): Promise<void> {
    await this.commentsRepository.delete(id)
  }

  async update(id: string, comment: Partial<Comment>): Promise<Comment> {
    await this.commentsRepository.update(id, comment)
    return this.commentsRepository.findOne(id)
  }

  async createCommentReply(
    commentReplyDto: CreateReplyCommentBodyDto,
    userId: string,
  ): Promise<CommentReply> {
    const comment = await this.findOne({
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
