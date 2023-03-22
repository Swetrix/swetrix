import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ActionToken } from './action-token.entity'
import { ActionTokensService } from './action-tokens.service'

describe('ActionTokensService', () => {
  let service: ActionTokensService

  const ACTIONTOKEN_REPOSITORY = getRepositoryToken(ActionToken)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionTokensService,
        {
          provide: ACTIONTOKEN_REPOSITORY,
          useValue: {
            delete: jest.fn(),
            save: jest.fn(),
            findOneOrFail: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<ActionTokensService>(ActionTokensService)
  })

  describe('root', () => {
    it('should be defined with service1', () => {
      expect(service).toBeDefined()
    })
  })

  describe('activation-token.service definding', () => {
    it('should be defined deleteMultiple()', () => {
      expect(service.deleteMultiple).toBeDefined()
    })
    it('should be defined createForUser()', () => {
      expect(service.createForUser).toBeDefined()
    })
    it('should be defined find()', () => {
      expect(service.find).toBeDefined()
    })
    it('should be defined delete()', () => {
      expect(service.delete).toBeDefined()
    })
  })
})
