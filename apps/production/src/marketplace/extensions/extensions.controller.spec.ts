import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Extension } from './entities/extension.entity'
import { CategoriesService } from '../categories/categories.service'
import { ExtensionsController } from './extensions.controller'
import { ExtensionsService } from './extensions.service'
import { Category } from '../categories/category.entity'

describe('ExtensionsController', () => {
  let controller: ExtensionsController
  const EXTENSION_REPOSITORY_TOKEN = getRepositoryToken(Extension)
  const CATEGORY_REPOSITORY_TOKEN = getRepositoryToken(Category)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExtensionsController],
      providers: [
        ExtensionsService,
        {
          provide: EXTENSION_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        CategoriesService,
        {
          provide: CATEGORY_REPOSITORY_TOKEN,
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
    it('createExtension should be defined', () => {
      expect(controller.createExtension).toBeDefined()
    })
    it('deleteExtension should be defined', () => {
      expect(controller.deleteExtension).toBeDefined()
    })
    it('getAllExtension should be defined', () => {
      expect(controller.getExtension).toBeDefined()
    })

    it('getExtension should be defined', () => {
      expect(controller.getExtension).toBeDefined()
    })
    it('updateExtension should be defined', () => {
      expect(controller.updateExtension).toBeDefined()
    })
  })
})
