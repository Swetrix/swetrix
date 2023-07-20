import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm'
import * as _includes from 'lodash/includes'
import * as _map from 'lodash/map'
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
      throw new NotFoundException('Comment not found')
    }

    const commentsReplies = await this.findAllCommentReplies(comment.id)

    if (_includes(_map(commentsReplies, 'userId'), userId)) {
      throw new BadRequestException('You have already replied to this comment')
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
    return this.commentReplyRepository.findOne(id, {
      relations: ['parentComment', 'user'],
    })
  }

  async updateCommentReply(
    id: string,
    commentReplyDto: UpdateCommentReplyBodyDto,
    userId: string,
  ): Promise<CommentReply | undefined> {
    const commentReply = await this.findCommentReplyById(id)

    if (!commentReply) {
      throw new NotFoundException('Comment reply not found')
    }

    if (commentReply.userId !== userId) {
      throw new BadRequestException(
        'You are not the owner of this comment reply',
      )
    }

    await this.commentReplyRepository.update(id, commentReplyDto)

    return this.findCommentReplyById(id)
  }

  async deleteCommentReply(id: string): Promise<void> {
    await this.commentReplyRepository.delete(id)
  }
}
