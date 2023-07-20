import { Test, TestingModule } from '@nestjs/testing'
import { CommentReplyService } from './comment-reply.service'

describe('CommentReplyService', () => {
  let service: CommentReplyService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommentReplyService],
    }).compile()

    service = module.get<CommentReplyService>(CommentReplyService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
