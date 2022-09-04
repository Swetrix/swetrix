import { Test, TestingModule } from '@nestjs/testing'
import { CategoriesService } from './categories.service'
import { Repository } from 'typeorm'
import { Category } from './category.entity'
import { getRepositoryToken } from '@nestjs/typeorm'

describe('CategoriesService', () => {
  let service: CategoriesService
  let repository: Repository<Category>

  const CATEGORY_REPOSITORY_TOKEN = getRepositoryToken(Category)

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: CATEGORY_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile()

    service = module.get<CategoriesService>(CategoriesService)
    repository = module.get<Repository<Category>>(CATEGORY_REPOSITORY_TOKEN)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
