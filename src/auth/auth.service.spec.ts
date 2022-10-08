import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AppLoggerService } from 'src/logger/logger.service'
import { User } from 'src/user/entities/user.entity'
import { UserService } from 'src/user/user.service'
import { Util } from 'src/Util/Util'
import { Repository } from 'typeorm'
import { AuthService } from './auth.service'
import * as bcrypt from 'bcrypt'

describe('AuthService', () => {
  let service: AuthService
  let repository: Repository<User>
  let util = new Util()
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
    it('should be defined service', () => {
      expect(service).toBeDefined()
    }),
    it('should be defined repository', () => {
      expect(repository).toBeDefined()
    })
  }),
  describe('auth.service definding', () => {
    it('should be defined checkIfPasswordLeaked()', () => {
      expect(service.checkIfPasswordLeaked).toBeDefined()
    }),
    it('should be defined checkPassword()', () => {
      expect(service.checkPassword).toBeDefined()
    }),
    it('should be defined get()', () => {
      expect(service.get).toBeDefined()
    }),
    it('should be defined hashPassword()', () => {
      expect(service.hashPassword).toBeDefined()
    }),
    it('should be defined login()', () => {
      expect(service.login).toBeDefined()
    }),
    it('should be defined postLoginProcess()', () => {
      expect(service.postLoginProcess).toBeDefined()
    }),
    it('should be defined processUser()', () => {
      expect(service.processUser).toBeDefined()
    }),
    it('should be defined sha1hash()', () => {
      expect(service.sha1hash).toBeDefined()
    }),
    it('should be defined validateUser()', () => {
      expect(service.validateUser).toBeDefined()
    })

    it('should be defined', () => {
      expect(repository).toBeDefined()
    })

    it('should be hashPassword function not null and tobedefined', () => {
      let pass = util.getString()
      expect(service.hashPassword(pass)).resolves.not.toBeNull()
      expect(service.hashPassword).toBeDefined()
    })

    it('should be get function not null and tobedefined', () => {
      let hash = util.getString()
      expect(service.get(hash)).resolves.not.toBeNull()
      expect(service.get).toBeDefined()
    })

    it('should be sha1hash function not null and tobedefined', () => {
      let string = util.getString()
      expect(service.sha1hash(string)).resolves.not.toBeNull()
      expect(service.sha1hash).toBeDefined()
    })
    it('should be checkIfPasswordLeaked function not null and tobedefined', () => {
      let pass = util.getString()
      expect(service.checkIfPasswordLeaked(pass)).resolves.not.toBeNull()
      expect(service.checkIfPasswordLeaked).toBeDefined()
    })
    it('should be checkPassword function not null and tobedefined', () => {
      let passToCheck = util.getString()
      let hashedPass = util.getString()
      expect(service.checkPassword(passToCheck, hashedPass)).not.toBeNull()
      expect(service.checkPassword).toBeDefined()
    })

    it('should be validateUser function not null and tobedefined', () => {
      let email = util.getString()
      let pass = util.getString()
      expect(service.validateUser(email, pass)).rejects.toThrow()
      expect(service.validateUser).toBeDefined()
    })

    it('should be processUser function not null and tobedefined', () => {
      let user = util.getUser()
      expect(service.processUser(user)).not.toBeNull()
      expect(service.processUser).toBeDefined()
    })

    it('should be postLoginProcess function not null and tobedefined', () => {
      let user = util.getUser()
      expect(service.postLoginProcess(user)).not.toBeNull()
      expect(service.postLoginProcess).toBeDefined()
    })

    it('should be login function not null and tobedefined', () => {
      let user = util.getUser()
      expect(service.login(user)).not.toBeNull()
      expect(service.login).toBeDefined()
    })
  })
  // describe('auth.service testing', () => {
  //   it('should return correct hashPassword()', async () => {
  //     const password = 'test'
  //     const salt = await bcrypt.genSalt(10)
  //     const hashedStringFromService = await service.hashPassword(password)
  //     const hashedPass = await bcrypt.hash(password, salt)
  //     console.log('Hashed password1: ' + hashedStringFromService)
  //     console.log('Hashed password2: ' + hashedPass)
  //     expect(hashedStringFromService).toEqual(hashedPass)
  //   })
  // })
})
