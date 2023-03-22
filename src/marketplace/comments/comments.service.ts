import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm'
import { Comment } from './entities/comment.entity'

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment) private commentsRepository: Repository<Comment>,
  ) {}

  async findAndCount(
    options: FindManyOptions<Comment>,
  ): Promise<[Comment[], number]> {
    return this.commentsRepository.findAndCount({ ...options })
  }

  async findOne(options: FindOneOptions<Comment>): Promise<Comment> {
    return this.commentsRepository.findOne({ ...options })
  }

  async save(
    comment: Omit<Comment, 'id' | 'addedAt' | 'extension' | 'user'>,
  ): Promise<Comment> {
    return this.commentsRepository.save(comment)
  }

  async delete(id: string): Promise<void> {
    await this.commentsRepository.delete(id)
  }
}
