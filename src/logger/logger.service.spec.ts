import { Test, TestingModule } from '@nestjs/testing'
import { AppLoggerService } from './logger.service'

describe('AppLoggerService', () => {
  let service: AppLoggerService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppLoggerService],
    }).compile()

    service = module.get<AppLoggerService>(AppLoggerService)
  })

  describe('root', () => {
    it('should be defined service', () => {
      expect(service).toBeDefined()
    }),
      it('should be defined log()', () => {
        expect(service.log).toBeDefined()
      })
  })
})
