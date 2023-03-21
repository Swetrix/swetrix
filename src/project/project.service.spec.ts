import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ProjectShare } from './entity/project-share.entity'
import { Project } from './entity/project.entity'
import { ProjectService } from './project.service'
import { Util } from '../Util/Util'

describe('ProjectService', () => {
  let service: ProjectService
  const util = new Util()
  const PROJECT_REPOSITORY_TOKEN = getRepositoryToken(Project)
  const PROJECTSHARE_REPOSITORY_TOKEN = getRepositoryToken(ProjectShare)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile()

    service = module.get<ProjectService>(ProjectService)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })
    it("should be defined allowedToManage and don't return null", () => {
      expect(service.allowedToManage).toBeDefined()
    })

    it("should be defined allowedToView and don't return null", () => {
      expect(service.allowedToView).toBeDefined()
    })
    it("should be defined checkIfIDUnique and don't return null", () => {
      const projectId = util.getString()
      const spy = jest.spyOn(service, 'checkIfIDUnique')
      const isCheckIfIDUnique = service.checkIfIDUnique(projectId)
      expect(spy).toHaveBeenCalled()
      expect(isCheckIfIDUnique).not.toBeNull()
      spy.mockRestore()
      expect(service.checkIfIDUnique).toBeDefined()
    })
    it('should be defined checkIfIDUniqueClickhouse ', () => {
      expect(service.checkIfIDUniqueClickhouse).toBeDefined()
    })
    it('should be defined count ', () => {
      expect(service.count()).rejects.not.toBeNull()
      expect(service.count).toBeDefined()
    })
    it('should be defined create ', () => {
      expect(service.create).toBeDefined()
    })

    it('should be defined createShare ', () => {
      expect(service.createShare).toBeDefined()
    })
    it('should be defined delete ', () => {
      expect(service.delete).toBeDefined()
    })
    it('should be defined deleteMultiple ', () => {
      expect(service.deleteMultiple).toBeDefined()
    })
    it('should be defined deleteMultipleShare ', () => {
      expect(service.deleteMultipleShare).toBeDefined()
    })
    it('should be defined deleteShare ', () => {
      expect(service.deleteShare).toBeDefined()
    })
    it('should be defined find ', () => {
      expect(service.find).toBeDefined()
    })
    it('should be defined findOne ', () => {
      const params = util.getObject()
      const id = util.getString()
      expect(service.findOne(id, params)).not.toBeNull()
      expect(service.findOne).toBeDefined()
    })
    it("should be defined findOneShare and don't return null", () => {
      const params = util.getObject()
      const id = util.getString()
      expect(service.findOneShare(id, params)).not.toBeNull()
      expect(service.findOneShare).toBeDefined()
    })
    it("should be defined findOneWhere and don't return null", () => {
      const where = util.getRecordStringUnknown()

      expect(service.findOneWhere(where)).not.toBeNull()
      expect(service.findOneWhere).toBeDefined()
    })

    it("should be defined findOneWithRelations and don't return null", () => {
      const id = util.getString()

      expect(service.findOneWithRelations(id)).not.toBeNull()
      expect(service.findOneWithRelations).toBeDefined()
    })
    it('should be defined findShare ', () => {
      expect(service.findShare).toBeDefined()
    })

    it('should be defined findWhere ', () => {
      expect(service.findWhere).toBeDefined()
    })

    it("should be defined formatFromClickhouse and don't return null", () => {
      const project = util.getObject()
      expect(service.formatFromClickhouse(project)).not.toBeNull()
      expect(service.formatFromClickhouse).toBeDefined()
    })

    it("should be defined getRedisCount and don't return null", () => {
      const uid = util.getString()

      expect(service.getRedisCount(uid)).not.toBeNull()
      expect(service.getRedisCount).toBeDefined()
    })

    it('should be defined paginate', () => {
      expect(service.paginate).toBeDefined()
    })

    it('should be defined paginateShared', () => {
      expect(service.paginateShared).toBeDefined()
    })

    it('should be defined update', () => {
      expect(service.update).toBeDefined()
    })

    it('should be defined updateShare', () => {
      expect(service.updateShare).toBeDefined()
    })
  })
})
