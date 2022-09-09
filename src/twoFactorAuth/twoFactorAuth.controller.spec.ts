import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AuthService } from 'src/auth/auth.service'
import { AppLoggerService } from 'src/logger/logger.service'
import { MailerService } from 'src/mailer/mailer.service'
import { User } from 'src/user/entities/user.entity'
import { UserService } from 'src/user/user.service'
import { TwoFactorAuthController } from './twoFactorAuth.controller'
import { TwoFactorAuthService } from './twoFactorAuth.service'

describe('TwoFactorAuthController', () => {
  let controller: TwoFactorAuthController
  const USER_REPOSITORY_TOKEN = getRepositoryToken(User)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwoFactorAuthController],

      providers: [
        TwoFactorAuthService,
        UserService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        AuthService,
        AppLoggerService,
        MailerService,
      ],
    }).compile()

    controller = module.get<TwoFactorAuthController>(TwoFactorAuthController)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined()
    })

    it('authenticate should be defined', () => {
      expect(controller.authenticate).toBeDefined()
    })

    it('register should be defined', () => {
      expect(controller.register).toBeDefined()
    })

    it('turnOffTwoFactorAuthentication should be defined', () => {
      expect(controller.turnOffTwoFactorAuthentication).toBeDefined()
    })

    it('turnOnTwoFactorAuthentication should be defined', () => {
      expect(controller.turnOnTwoFactorAuthentication).toBeDefined()
    })
  })
})
