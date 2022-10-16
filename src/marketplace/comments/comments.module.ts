import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserModule } from '../../user/user.module'
import { ExtensionsModule } from '../extensions/extensions.module'
import { CommentsController } from './comments.controller'
import { CommentsService } from './comments.service'
import { Comment } from './entities/comment.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Comment]), ExtensionsModule, UserModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
