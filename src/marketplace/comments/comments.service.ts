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
    return await this.commentsRepository.findAndCount({ ...options })
  }

  async findOne(options: FindOneOptions<Comment>): Promise<Comment> {
    return await this.commentsRepository.findOne({ ...options })
  }

  async delete(id: string): Promise<void> {
    await this.commentsRepository.delete(id)
  }
}
