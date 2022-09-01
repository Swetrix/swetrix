import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ActionToken } from 'src/action-tokens/action-token.entity'
import { ActionTokensService } from 'src/action-tokens/action-tokens.service'
import { AuthService } from 'src/auth/auth.service'
import { AppLoggerService } from 'src/logger/logger.service'
import { MailerService } from 'src/mailer/mailer.service'
import { ProjectShare } from 'src/project/entity/project-share.entity'
import { Project } from 'src/project/entity/project.entity'
import { ProjectService } from 'src/project/project.service'
import { User } from './entities/user.entity'
import { UserController } from './user.controller'
import { UserService } from './user.service'

describe('UserController', () => {
  let controller: UserController
  const USER_REPOSITORY_TOKEN = getRepositoryToken(User)
  const PROJECT_REPOSITORY_TOKEN = getRepositoryToken(Project)
  const PROJECTSHARE_REPOSITORY_TOKEN = getRepositoryToken(ProjectShare)
  const ACTIONTOKEN_REPOSITORY = getRepositoryToken(ActionToken)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        AuthService,
        ProjectService,
        {
          provide: PROJECT_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: PROJECTSHARE_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        ActionTokensService,
        {
          provide: ACTIONTOKEN_REPOSITORY,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        MailerService,
        AppLoggerService,
      ],
    }).compile()

    controller = module.get<UserController>(UserController)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined()
    })
  })
})
