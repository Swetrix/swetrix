import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Extension } from './entities/extension.entity'
import { ExtensionsController } from './extensions.controller'
import { ExtensionsService } from './extensions.service'

describe('ExtensionsController', () => {
  let controller: ExtensionsController
  const EXTENSION_REPOSITORY_TOKEN = getRepositoryToken(Extension)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExtensionsController],
      providers: [
        ExtensionsService,
        {
          provide: EXTENSION_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile()

    controller = module.get<ExtensionsController>(ExtensionsController)
  })
  describe('root', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined()
    })
  })
})
