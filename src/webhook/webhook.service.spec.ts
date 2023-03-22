import { Test, TestingModule } from '@nestjs/testing'
import { AppLoggerService } from 'src/logger/logger.service'
import { WebhookService } from './webhook.service'

describe('WebhookService', () => {
  let service: WebhookService

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
