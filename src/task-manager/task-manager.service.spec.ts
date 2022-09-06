import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ActionToken } from 'src/action-tokens/action-token.entity'
import { ActionTokensService } from 'src/action-tokens/action-tokens.service'
import { AnalyticsService } from 'src/analytics/analytics.service'
import { AppLoggerService } from 'src/logger/logger.service'
import { MailerService } from 'src/mailer/mailer.service'
import { ProjectShare } from 'src/project/entity/project-share.entity'
import { Project } from 'src/project/entity/project.entity'
import { ProjectService } from 'src/project/project.service'
import { User } from 'src/user/entities/user.entity'
import { UserService } from 'src/user/user.service'
import { Util } from 'src/Util/Util'
import { TaskManagerService } from './task-manager.service'

describe('TaskManagerService', () => {
  let service: TaskManagerService
  let util = new Util()
  const USER_REPOSITORY_TOKEN = getRepositoryToken(User)
  const ACRIONTOKENS_REPOSITORY_TOKEN = getRepositoryToken(ActionToken)
  const PROJECT_REPOSITORY_TOKEN = getRepositoryToken(Project)
  const PROJECTSHARE_REPOSITORY_TOKEN = getRepositoryToken(ProjectShare)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskManagerService,
        MailerService,
        AppLoggerService,
        UserService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
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
        ActionTokensService,
        {
          provide: ACRIONTOKENS_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile()

    service = module.get<TaskManagerService>(TaskManagerService)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })
    it("should be defined checkLeftEvents and don't return null", () => {
      expect(service.checkLeftEvents()).rejects.not.toBeNull()
      expect(service.checkLeftEvents).toBeDefined()
    })
    it("should be defined deleteOldShareInvitations and don't return null", () => {
      expect(service.deleteOldShareInvitations()).rejects.not.toBeNull()
      expect(service.deleteOldShareInvitations).toBeDefined()
    })

    it("should be defined generateSessionSalt and don't return null", () => {
      expect(service.generateSessionSalt()).not.toBeNull()
      expect(service.generateSessionSalt).toBeDefined()
    })
    it("should be defined getGeneralStats and don't return null", () => {
      expect(service.getGeneralStats()).rejects.not.toBeNull()
      expect(service.getGeneralStats).toBeDefined()
    })
    it("should be defined monthlyReportsHandler and don't return null", () => {
      expect(service.monthlyReportsHandler()).rejects.not.toBeNull()
      expect(service.monthlyReportsHandler).toBeDefined()
    })
    it("should be defined saveLogData and don't return null", () => {
      expect(service.saveLogData()).not.toBeNull()
      expect(service.saveLogData).toBeDefined()
    })
    it("should be defined weeklyReportsHandler and don't return null", () => {
      expect(service.weeklyReportsHandler()).rejects.not.toBeNull()
      expect(service.weeklyReportsHandler).toBeDefined()
    })
  })
})
