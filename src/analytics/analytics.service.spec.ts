import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProjectShare } from '../project/entity/project-share.entity'
import { Project } from '../project/entity/project.entity'
import { ProjectService } from '../project/project.service'
import { AnalyticsService } from './analytics.service'

describe('AnalyticsService', () => {
  let service: AnalyticsService

  const PROJECT_REPOSITORY_TOKEN = getRepositoryToken(Project)
  const PROJECT_SHARE_REPOSITORY_TOKEN = getRepositoryToken(ProjectShare)

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        ProjectService,
        {
          provide: PROJECT_REPOSITORY_TOKEN,
          useValue: {
            count: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        ProjectService,
        {
          provide: PROJECT_SHARE_REPOSITORY_TOKEN,
          useValue: {
            count: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<AnalyticsService>(AnalyticsService)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })
  }),
    describe('analytics.service definding', () => {
      it('should be defined with checkIpBlacklist()', () => {
        expect(service.checkIpBlacklist).toBeDefined()
      }),
        it('should be defined with checkOrigin()', () => {
          expect(service.checkOrigin).toBeDefined()
        }),
        it('should be defined with checkProjectAccess()', () => {
          expect(service.checkProjectAccess).toBeDefined()
        }),
        it('should be defined with getFiltersQuery()', () => {
          expect(service.getFiltersQuery).toBeDefined()
        }),
        it('should be defined with getRedisProject()', () => {
          expect(service.getRedisProject).toBeDefined()
        }),
        it('should be defined with getSummary()', () => {
          expect(service.getSummary).toBeDefined()
        }),
        it('should be defined with groupByTimeBucket()', () => {
          expect(service.groupByTimeBucket).toBeDefined()
        }),
        it('should be defined with isSessionOpen()', () => {
          expect(service.isSessionOpen).toBeDefined()
        }),
        it('should be defined with isUnique()', () => {
          expect(service.isUnique).toBeDefined()
        }),
        it('should be defined with processCustomEV()', () => {
          expect(service.processCustomEV).toBeDefined()
        }),
        it('should be defined with validate()', () => {
          expect(service.validate).toBeDefined()
        }),
        it('should be defined with validateHB()', () => {
          expect(service.validateHB).toBeDefined()
        }),
        it('should be defined with validatePID()', () => {
          expect(service.validatePID).toBeDefined()
        }),
        it('should be defined with validatePeriod()', () => {
          expect(service.validatePeriod).toBeDefined()
        }),
        it('should be defined with validateTimebucket()', () => {
          expect(service.validateTimebucket).toBeDefined()
        })
    })
})
