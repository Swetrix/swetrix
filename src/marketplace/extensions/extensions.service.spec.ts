import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { User } from 'src/user/entities/user.entity'
import { ExtensionsService } from './extensions.service'
import { Extension } from './extension.entity'

describe('ExtensionsService', () => {
  let service: ExtensionsService
  const EXTENSION_REPOSITORY_TOKEN = getRepositoryToken(Extension)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtensionsService,
        {
          provide: EXTENSION_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile()

    service = module.get<ExtensionsService>(ExtensionsService)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })
  })
})
