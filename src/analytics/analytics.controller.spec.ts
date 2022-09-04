import { Test, TestingModule } from '@nestjs/testing'
import { ProjectShare } from '../project/entity/project-share.entity'
import { Project } from '../project/entity/project.entity'
import { Repository } from 'typeorm'
import { AppLoggerService } from '../logger/logger.service'
import { TaskManagerService } from '../task-manager/task-manager.service'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ProjectService } from '../project/project.service'
import { MailerService } from '../mailer/mailer.service'
import { UserService } from '../user/user.service'
import { ActionTokensService } from '../action-tokens/action-tokens.service'
import { User } from '../user/entities/user.entity'
import { ActionToken } from '../action-tokens/action-token.entity'

describe('AnalyticsController', () => {
  let controller: AnalyticsController
  let actionTokenRepository: Repository<ActionToken>
  let projectsRepository: Repository<Project>
  let projectShareRepository: Repository<ProjectShare>
  let userRepository: Repository<User>
  
  const USER_REPOSITORY_TOKEN = getRepositoryToken(User)
  const ACTION_TOKEN_REPOSITORY_TOKEN = getRepositoryToken(ActionToken)
  const PROJECT_REPOSITORY_TOKEN = getRepositoryToken(Project)
  const PROJECT_SHARE_REPOSITORY_TOKEN = getRepositoryToken(ProjectShare)

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        AnalyticsService, 
        AppLoggerService, 
        TaskManagerService,
        ProjectService, 
        {
          provide: PROJECT_REPOSITORY_TOKEN,
          useValue: { count: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(), findOne: jest.fn(), find: jest.fn() },
        },
        ProjectService,
        {
          provide: PROJECT_SHARE_REPOSITORY_TOKEN,
          useValue: { count: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn(), findOne: jest.fn(), find: jest.fn() },
        },
        MailerService,
        UserService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        ActionTokensService,
        {
          provide: ACTION_TOKEN_REPOSITORY_TOKEN,
          useValue: { delete: jest.fn(), save: jest.fn(), findOneOrFail: jest.fn() },
        },
      ],
    }).compile()
    controller = module.get<AnalyticsController>(AnalyticsController)
    userRepository = module.get<Repository<User>>(USER_REPOSITORY_TOKEN)
    actionTokenRepository = module.get<Repository<ActionToken>>(ACTION_TOKEN_REPOSITORY_TOKEN)
    projectShareRepository = module.get<Repository<ProjectShare>>(PROJECT_SHARE_REPOSITORY_TOKEN)
    projectsRepository = module.get<Repository<Project>>(PROJECT_REPOSITORY_TOKEN)
  })

  describe('root', () => {
    it('should be defined controller', () => {
      expect(controller).toBeDefined()
    }),
    it('should be defined userRepository', () => {
      expect(userRepository).toBeDefined()
    }),
    it('should be defined actionTokenRepository', () => {
      expect(actionTokenRepository).toBeDefined()
    }),
    it('should be defined projectShareRepository', () => {
      expect(projectShareRepository).toBeDefined()
    }),
    it('should be defined projectsRepository', () => {
      expect(projectsRepository).toBeDefined()
    })
  })
  describe('analytics.controller', () => {
    it('should be defined with getData()', () => {
      expect(controller.getData).toBeDefined()
    }),
    it('should be defined with getGeneralStats()', () => {
      expect(controller.getGeneralStats).toBeDefined()
    }),
    it('should be defined with getHeartBeatStats()', () => {
      expect(controller.getHeartBeatStats).toBeDefined()
    }),
    it('should be defined with getOverallStats()', () => {
      expect(controller.getOverallStats).toBeDefined()
    }),
    it('should be defined with heartbeat()', () => {
      expect(controller.heartbeat).toBeDefined()
    }),
    it('should be defined with log()', () => {
      expect(controller.log).toBeDefined()
    }),
    it('should be defined with logCustom()', () => {
      expect(controller.logCustom).toBeDefined()
    }),
    it('should be defined with noscript()', () => {
      expect(controller.noscript).toBeDefined()
    })
  })
})
