import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AppLoggerService } from 'src/logger/logger.service'
import { User } from 'src/user/entities/user.entity'
import { UserService } from 'src/user/user.service'
import { Repository } from 'typeorm'
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

    it('should be defined', () => {
      expect(repository).toBeDefined()
    })

    it('should be hashPassword function not null', () => {
      let pass = 'Password'
      expect(service.hashPassword(pass)).resolves.not.toBeNull()
    })

    it('should be get function not null', () => {
      let hash = 'HASSSSSSS'
      expect(service.get(hash)).resolves.not.toBeNull()
    })

    it('should be sha1hash function not null', () => {
      let string = 'string'
      expect(service.sha1hash(string)).resolves.not.toBeNull()
    })
    it('should be checkIfPasswordLeaked function not null', () => {
      let pass = 'password'
      expect(service.checkIfPasswordLeaked(pass)).resolves.not.toBeNull()
    })
    it('should be checkPassword function not null', () => {
      let passToCheck = 'test Password'
      let hashedPass = 'hash Password'
      expect(service.checkPassword(passToCheck, hashedPass)).not.toBeNull()
    })

    it('should be validateUser function not null', () => {
      let email = 'email'
      let pass = 'password'
      expect(service.validateUser(email, pass)).rejects.toThrow()
    })

    it('should be processUser function not null', () => {
      let user = new User()
      expect(service.processUser(user)).not.toBeNull()
    })

    it('should be postLoginProcess function not null', () => {
      let user = new User()
      expect(service.postLoginProcess(user)).not.toBeNull()
    })

    it('should be login function not null', () => {
      let user = new User()
      expect(service.login(user)).not.toBeNull()
    })
  })
})
