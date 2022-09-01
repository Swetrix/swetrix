import { Test, TestingModule } from '@nestjs/testing'
import { ActionTokensService } from 'src/action-tokens/action-tokens.service'
import { AppLoggerService } from 'src/logger/logger.service'
import { MailerService } from 'src/mailer/mailer.service'
import { ProjectService } from 'src/project/project.service'
import { UserService } from 'src/user/user.service'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { ProjectShare } from 'src/project/entity/project-share.entity'
import { getRepositoryToken } from '@nestjs/typeorm'
import { User } from 'src/user/entities/user.entity'
import { ActionToken } from 'src/action-tokens/action-token.entity'
import { Project } from 'src/project/entity/project.entity'
import { Repository } from 'typeorm'

describe('AuthController', () => {
  let controller: AuthController
  let userRepository: Repository<User>
  let actionTokensRepository: Repository<ActionToken>
  let projectsRepository: Repository<Project>
  let projectShareRepository: Repository<ProjectShare>
  const USER_REPOSITORY_TOKEN = getRepositoryToken(User)
  const ACRIONTOKENS_REPOSITORY_TOKEN = getRepositoryToken(ActionToken)
  const PROJECT_REPOSITORY_TOKEN = getRepositoryToken(Project)
  const PROJECTSHARE_REPOSITORY_TOKEN = getRepositoryToken(ProjectShare)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        UserService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        MailerService,
        ActionTokensService,
        {
          provide: ACRIONTOKENS_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        ProjectService,
        {
          provide: PROJECT_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: PROJECTSHARE_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        AppLoggerService,
      ],
    }).compile()
    projectsRepository = module.get<Repository<Project>>(
      PROJECT_REPOSITORY_TOKEN,
    )
    projectShareRepository = module.get<Repository<ProjectShare>>(
      PROJECTSHARE_REPOSITORY_TOKEN,
    )
    actionTokensRepository = module.get<Repository<ActionToken>>(
      ACRIONTOKENS_REPOSITORY_TOKEN,
    )
    userRepository = module.get<Repository<User>>(USER_REPOSITORY_TOKEN)
    controller = module.get<AuthController>(AuthController)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined()
    })
  })
})
