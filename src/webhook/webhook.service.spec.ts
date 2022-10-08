import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AppLoggerService } from 'src/logger/logger.service'
import { User } from 'src/user/entities/user.entity'
import { UserService } from 'src/user/user.service'
import { Util } from 'src/Util/Util'
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'

describe('WebhookService', () => {
  let service: WebhookService
  let util = new Util()

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

    it("should be defined ksort and don't return null", () => {
      expect(service.ksort).toBeDefined()
    })
    it("should be defined validateWebhook and don't return null", () => {
      expect(service.validateWebhook).toBeDefined()
    })

    it("should be defined verifyIP and don't return null", () => {
      expect(service.verifyIP).toBeDefined()
    })
  })
})
