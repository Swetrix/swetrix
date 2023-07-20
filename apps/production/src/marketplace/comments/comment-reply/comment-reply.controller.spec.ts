import { Test, TestingModule } from '@nestjs/testing'
import { CommentReplyController } from './comment-reply.controller'

describe('CommentReplyController', () => {
  let controller: CommentReplyController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentReplyController],
    }).compile()

    controller = module.get<CommentReplyController>(CommentReplyController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
