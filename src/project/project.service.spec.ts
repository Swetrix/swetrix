import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ProjectShare } from './entity/project-share.entity'
import { Project } from './entity/project.entity'
import { ProjectService } from './project.service'
import { Util } from '../Util/Util'

describe('ProjectService', () => {
  let service: ProjectService
  let util = new Util()
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
      let projectId = util.getString()
      const spy = jest.spyOn(service, 'checkIfIDUnique')
      const isCheckIfIDUnique = service.checkIfIDUnique(projectId)
      expect(spy).toHaveBeenCalled()
      expect(isCheckIfIDUnique).not.toBeNull()
      spy.mockRestore()
      expect(service.checkIfIDUnique).toBeDefined()
    })
    it("should be defined checkIfIDUniqueClickhouse and don't return null", () => {
      expect(service.checkIfIDUniqueClickhouse).toBeDefined()
    })
    it("should be defined count and don't return null", () => {
      expect(service.count()).rejects.not.toBeNull()
      expect(service.count).toBeDefined()
    })
    it("should be defined create and don't return null", () => {
      let project = util.getProject()
      expect(service.create(project)).not.toBeNull()
      expect(service.create).toBeDefined()
    })

    it("should be defined createShare and don't return null", () => {
      let projectShare = util.getProjectShare()
      expect(service.createShare(projectShare)).not.toBeNull()
      expect(service.createShare).toBeDefined()
    })
    it("should be defined delete and don't return null", () => {
      let id = util.getString()
      expect(service.delete(id)).rejects.not.toBeNull()
      expect(service.delete).toBeDefined()
    })
    it("should be defined deleteMultiple and don't return null", () => {
      let array = util.getStringArray()

      expect(service.deleteMultiple(array)).rejects.not.toBeNull()
      expect(service.deleteMultiple).toBeDefined()
    })
    it("should be defined deleteMultipleShare and don't return null", () => {
      let where = util.getString()
      expect(service.deleteMultipleShare(where)).rejects.not.toBeNull()
      expect(service.deleteMultipleShare).toBeDefined()
    })
    it("should be defined deleteShare and don't return null", () => {
      let id = util.getString()
      expect(service.deleteShare(id)).rejects.not.toBeNull()
      expect(service.deleteShare).toBeDefined()
    })
    it("should be defined find and don't return null", () => {
      expect(service.find).toBeDefined()
    })
    it("should be defined findOne and don't return null", () => {
      let params = util.getObject()
      let id = util.getString()
      expect(service.findOne(id, params)).not.toBeNull()
      expect(service.findOne).toBeDefined()
    })
    it("should be defined findOneShare and don't return null", () => {
      let params = util.getObject()
      let id = util.getString()
      expect(service.findOneShare(id, params)).not.toBeNull()
      expect(service.findOneShare).toBeDefined()
    })
    it("should be defined findOneWhere and don't return null", () => {
      let where = util.getRecordStringUnknown()

      expect(service.findOneWhere(where)).not.toBeNull()
      expect(service.findOneWhere).toBeDefined()
    })

    it("should be defined findOneWithRelations and don't return null", () => {
      let id = util.getString()

      expect(service.findOneWithRelations(id)).not.toBeNull()
      expect(service.findOneWithRelations).toBeDefined()
    })
    it("should be defined findShare and don't return null", () => {
      expect(service.findShare).toBeDefined()
    })

    it("should be defined findWhere and don't return null", () => {
      expect(service.findWhere).toBeDefined()
    })

    it("should be defined formatFromClickhouse and don't return null", () => {
      let project = util.getObject()
      expect(service.formatFromClickhouse(project)).not.toBeNull()
      expect(service.formatFromClickhouse).toBeDefined()
    })

    it("should be defined getRedisCount and don't return null", () => {
      let uid = util.getString()

      expect(service.getRedisCount(uid)).not.toBeNull()
      expect(service.getRedisCount).toBeDefined()
    })

    it("should be defined paginate and don't return null", () => {
      expect(service.paginate).toBeDefined()
    })

    it("should be defined paginateShared and don't return null", () => {
      expect(service.paginateShared).toBeDefined()
    })

    it("should be defined update and don't return null", () => {
      expect(service.update).toBeDefined()
    })

    it("should be defined updateShare and don't return null", () => {
      expect(service.updateShare).toBeDefined()
    })
  })
})
