import { Test, TestingModule } from '@nestjs/testing'
import { Repository } from 'typeorm'
import { getRepositoryToken } from '@nestjs/typeorm'
import { CategoriesService } from './categories.service'
import { Category } from './category.entity'

describe('CategoriesService', () => {
  let service: CategoriesService
  // eslint-disable-next-line no-unused-vars
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

  describe('root', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })
    it('create should be defined', () => {
      expect(service.create).toBeDefined()
    })
    it('delete create should be defined', () => {
      expect(service.delete).toBeDefined()
    })
    it('findAndCount delete create should be defined', () => {
      expect(service.findAndCount).toBeDefined()
    })
    it('findById delete create should be defined', () => {
      expect(service.findById).toBeDefined()
    })
    it('findByName delete create should be defined', () => {
      expect(service.findByName).toBeDefined()
    })
    it('findOne delete create should be defined', () => {
      expect(service.findOne).toBeDefined()
    })
    it('save delete create should be defined', () => {
      expect(service.save).toBeDefined()
    })
    it('update delete create should be defined', () => {
      expect(service.update).toBeDefined()
    })
  })
})
