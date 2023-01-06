import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ActionToken } from 'src/action-tokens/action-token.entity'
import { ActionTokensService } from 'src/action-tokens/action-tokens.service'
import { OldAuthService } from 'src/old-auth/auth.service'
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
        OldAuthService,
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

    it('acceptShare should be defined', () => {
      expect(controller.acceptShare).toBeDefined()
    })

    it('create should be defined', () => {
      expect(controller.create).toBeDefined()
    })

    it('delete should be defined', () => {
      expect(controller.delete).toBeDefined()
    })
    it('deleteApiKey should be defined', () => {
      expect(controller.deleteApiKey).toBeDefined()
    })

    it('deleteSelf should be defined', () => {
      expect(controller.deleteSelf).toBeDefined()
    })

    it('deleteShare should be defined', () => {
      expect(controller.deleteShare).toBeDefined()
    })

    it('exportUserData should be defined', () => {
      expect(controller.exportUserData).toBeDefined()
    })

    it('generateApiKey should be defined', () => {
      expect(controller.generateApiKey).toBeDefined()
    })

    it('get should be defined', () => {
      expect(controller.get).toBeDefined()
    })

    it('searchUsers should be defined', () => {
      expect(controller.searchUsers).toBeDefined()
    })

    it('sendEmailConfirmation should be defined', () => {
      expect(controller.sendEmailConfirmation).toBeDefined()
    })

    it('update should be defined', () => {
      expect(controller.update).toBeDefined()
    })

    it('updateCurrentUser should be defined', () => {
      expect(controller.updateCurrentUser).toBeDefined()
    })
  })
})
