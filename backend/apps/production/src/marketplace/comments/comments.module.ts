import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserModule } from '../../user/user.module'
import { ExtensionsModule } from '../extensions/extensions.module'
import { CommentsController } from './comments.controller'
import { CommentsService } from './comments.service'
import { Comment } from './entities/comment.entity'
import { CommentReply } from './entities/comment-reply.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, CommentReply]),
    ExtensionsModule,
    UserModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
