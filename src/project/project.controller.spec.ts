import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ActionToken } from 'src/action-tokens/action-token.entity'
import { ActionTokensService } from 'src/action-tokens/action-tokens.service'
import { AppLoggerService } from 'src/logger/logger.service'
import { MailerService } from 'src/mailer/mailer.service'
import { User } from 'src/user/entities/user.entity'
import { UserService } from 'src/user/user.service'
import { ProjectShare } from './entity/project-share.entity'
import { Project } from './entity/project.entity'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'

describe('ProjectController', () => {
  let controller: ProjectController
  const PROJECT_REPOSITORY_TOKEN = getRepositoryToken(Project)
  const PROJECTSHARE_REPOSITORY_TOKEN = getRepositoryToken(ProjectShare)
  const USER_REPOSITORY_TOKEN = getRepositoryToken(User)
  const ACRIONTOKENS_REPOSITORY_TOKEN = getRepositoryToken(ActionToken)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        ProjectService,
        {
          provide: PROJECT_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: PROJECTSHARE_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        UserService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        AppLoggerService,
        ActionTokensService,
        {
          provide: ACRIONTOKENS_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        MailerService,
      ],
    }).compile()

    controller = module.get<ProjectController>(ProjectController)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined()
    })

    it('acceptShare should be defined', () => {
      expect(controller.acceptShare).toBeDefined()
    })
    it('create should be defined', () => {
      expect(controller.create).toBeDefined()
    })
    it('createForAdmin should be defined', () => {
      expect(controller.createForAdmin).toBeDefined()
    })
    it('delete should be defined', () => {
      expect(controller.delete).toBeDefined()
    })
    it('deleteShare should be defined', () => {
      expect(controller.deleteShare).toBeDefined()
    })
    it('get should be defined', () => {
      expect(controller.get).toBeDefined()
    })

    it('getAllProjects should be defined', () => {
      expect(controller.getAllProjects).toBeDefined()
    })

    it('getOne should be defined', () => {
      expect(controller.getOne).toBeDefined()
    })

    it('getShared should be defined', () => {
      expect(controller.getShared).toBeDefined()
    })

    it('getUserProject should be defined', () => {
      expect(controller.getUserProject).toBeDefined()
    })

    it('reset should be defined', () => {
      expect(controller.reset).toBeDefined()
    })

    it('share should be defined', () => {
      expect(controller.share).toBeDefined()
    })

    it('update should be defined', () => {
      expect(controller.update).toBeDefined()
    })

    it('updateShare should be defined', () => {
      expect(controller.updateShare).toBeDefined()
    })
  })
})
