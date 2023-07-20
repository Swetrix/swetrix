import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserModule } from '../../user/user.module'
import { ExtensionsModule } from '../extensions/extensions.module'
import { CommentsController } from './comments.controller'
import { CommentsService } from './comments.service'
import { Comment } from './entities/comment.entity'
import { CommentReply } from './comment-reply/entities/comment-reply.entity'
import { CommentReplyService } from './comment-reply/comment-reply.service'
import { CommentReplyController } from './comment-reply/comment-reply.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, CommentReply]),
    ExtensionsModule,
    UserModule,
  ],
  controllers: [CommentsController, CommentReplyController],
  providers: [CommentsService, CommentReplyService],
})
export class CommentsModule {}
