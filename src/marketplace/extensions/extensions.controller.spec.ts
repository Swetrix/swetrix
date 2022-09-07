import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { CategoriesService } from '../categories/categories.service'
import { Extension } from './extension.entity'
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
  })
})
