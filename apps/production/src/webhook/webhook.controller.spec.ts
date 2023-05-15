import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AppLoggerService } from 'src/logger/logger.service'
import { User } from 'src/user/entities/user.entity'
import { UserService } from 'src/user/user.service'
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'

describe('WebhookController', () => {
  let controller: WebhookController
  const USER_REPOSITORY_TOKEN = getRepositoryToken(User)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        AppLoggerService,
        UserService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        WebhookService,
      ],
    }).compile()

    controller = module.get<WebhookController>(WebhookController)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined()
    })

    it('paddleWebhook should be defined', () => {
      expect(controller.paddleWebhook).toBeDefined()
    })
  })
})
