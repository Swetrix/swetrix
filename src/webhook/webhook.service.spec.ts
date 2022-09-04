import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AppLoggerService } from 'src/logger/logger.service'
import { User } from 'src/user/entities/user.entity'
import { UserService } from 'src/user/user.service'
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'

describe('WebhookService', () => {
  let service: WebhookService
  const USER_REPOSITORY_TOKEN = getRepositoryToken(User)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookService, AppLoggerService],
    }).compile()

    service = module.get<WebhookService>(WebhookService)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })
  })
})
