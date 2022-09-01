import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AppLoggerService } from 'src/logger/logger.service'
import { User } from 'src/user/entities/user.entity'
import { UserService } from 'src/user/user.service'
import { Repository } from 'typeorm'
import { AuthController } from './auth.controller'
import { AuthModule } from './auth.module'
import { AuthService } from './auth.service'

describe('AuthService', () => {
  let service: AuthService
  let repository: Repository<User>

  const USER_REPOSITORY_TOKEN = getRepositoryToken(User)

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UserService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        AppLoggerService,
      ],
    }).compile()

    repository = module.get<Repository<User>>(USER_REPOSITORY_TOKEN)
    service = module.get<AuthService>(AuthService)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })
  })
})
