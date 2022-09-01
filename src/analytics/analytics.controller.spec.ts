import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ActionTokensService } from 'src/action-tokens/action-tokens.service'
import { AppLoggerService } from 'src/logger/logger.service'
import { MailerService } from 'src/mailer/mailer.service'
import { ProjectShare } from 'src/project/entity/project-share.entity'
import { Project } from 'src/project/entity/project.entity'
import { ProjectService } from 'src/project/project.service'
import { TaskManagerService } from 'src/task-manager/task-manager.service'
import { User } from 'src/user/entities/user.entity'
import { UserService } from 'src/user/user.service'
import { Repository } from 'typeorm'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
import { ActionToken } from '../action-tokens/action-token.entity'

describe('AnalyticsController', () => {
  let controller: AnalyticsController
  let projectsRepository: Repository<Project>
  let projectShareRepository: Repository<ProjectShare>
  const PROJECT_REPOSITORY_TOKEN = getRepositoryToken(Project)
  const PROJECTSHARE_REPOSITORY_TOKEN = getRepositoryToken(ProjectShare)
  const USER_REPOSITORY_TOKEN = getRepositoryToken(User)
  const ACTIONTOKEN_REPOSITORY = getRepositoryToken(ActionToken)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        AnalyticsService,
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
        TaskManagerService,
        MailerService,
        UserService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        ActionTokensService,
        {
          provide: ACTIONTOKEN_REPOSITORY,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile()
    controller = module.get<AnalyticsController>(AnalyticsController)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined()
    })
  })
})
