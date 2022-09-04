import { Test, TestingModule } from '@nestjs/testing'
import { AppLoggerService } from '../logger/logger.service'
import { MailerService } from './mailer.service'

describe('MailerService', () => {
  let service: MailerService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailerService, AppLoggerService],
    }).compile()

    service = module.get<MailerService>(MailerService)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })
  })
  describe('mailer.service definding', () => {
    it('should be defined sendEmail()', () => {
      expect(service.sendEmail).toBeDefined()
    })
  })
})
