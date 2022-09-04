import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { User } from 'src/user/entities/user.entity'
import { Repository } from 'typeorm'
import { ActionToken, ActionTokenType } from './action-token.entity'
import { ActionTokensService } from './action-tokens.service'

describe('ActionTokensService', () => {
  let service: ActionTokensService
  let repository: Repository<ActionToken>
  const ACTIONTOKEN_REPOSITORY = getRepositoryToken(ActionToken)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionTokensService,
        {
          provide: ACTIONTOKEN_REPOSITORY,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile()
    repository = module.get<Repository<ActionToken>>(ACTIONTOKEN_REPOSITORY)
    service = module.get<ActionTokensService>(ActionTokensService)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })
  })
})
