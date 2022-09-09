import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm'
import { UserModule } from 'src/user/user.module'
import { Repository } from 'typeorm'
import { CategoriesController } from './categories.controller'
import { CategoriesService } from './categories.service'
import { Category } from './category.entity'
import { UserService } from '../../user/user.service'
import { User } from 'src/user/entities/user.entity'

describe('CategoriesController', () => {
  let controller: CategoriesController
  const USER_REPOSITORY_TOKEN = getRepositoryToken(User)
  const CATEGORY_REPOSITORY_TOKEN = getRepositoryToken(Category)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        UserService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        CategoriesService,
        {
          provide: CATEGORY_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile()

    controller = module.get<CategoriesController>(CategoriesController)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined()
    })

    it('createCategory should be defined', () => {
      expect(controller.createCategory).toBeDefined()
    })
    it('deleteCategory should be defined', () => {
      expect(controller.deleteCategory).toBeDefined()
    })
    it('getAllCategories should be defined', () => {
      expect(controller.getAllCategories).toBeDefined()
    })

    it('getCategory should be defined', () => {
      expect(controller.getCategory).toBeDefined()
    })
    it('updateCategory should be defined', () => {
      expect(controller.updateCategory).toBeDefined()
    })
  })
})
