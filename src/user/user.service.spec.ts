import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Util } from 'src/Util/Util'
import { User } from './entities/user.entity'
import { UserService } from './user.service'

describe('UserService', () => {
  let service: UserService
  let util = new Util()
  const USER_REPOSITORY_TOKEN = getRepositoryToken(User)
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile()

    service = module.get<UserService>(UserService)
  })

  describe('root', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })
    it("should be defined count and don't return null", () => {
      expect(service.count()).rejects.not.toBeNull()
      expect(service.count).toBeDefined()
    })
    it("should be defined create and don't return null", () => {
      let userDTO = util.getUser()

      expect(service.create(userDTO)).resolves.not.toBeNull()
      expect(service.create).toBeDefined()
    })
    it("should be defined delete and don't return null", () => {
      let id = util.getString()
      expect(service.delete(id)).rejects.not.toBeNull()
      expect(service.delete).toBeDefined()
    })
    it("should be defined find and don't return null", () => {
      expect(service.find).toBeDefined()
    })
    it("should be defined findOne and don't return null", () => {
      expect(service.findOne).toBeDefined()
    })
    it("should be defined findOneWhere and don't return null", () => {
      expect(service.findOneWhere).toBeDefined()
    })
    it("should be defined findOneWithRelations and don't return null", () => {
      expect(service.findOneWithRelations).toBeDefined()
    })
    it("should be defined findWhere and don't return null", () => {
      expect(service.findWhere).toBeDefined()
    })
    it("should be defined findWhereWithRelations and don't return null", () => {
      expect(service.findWhereWithRelations).toBeDefined()
    })
    it("should be defined omitSensitiveData and don't return null", () => {
      let user = util.getUser()
      expect(service.omitSensitiveData(user)).not.toBeNull()
      expect(service.omitSensitiveData).toBeDefined()
    })
    it("should be defined paginate and don't return null", () => {
      let options = util.getPaginationOptionsInterface()
      expect(service.paginate(options)).rejects.not.toBeNull()
      expect(service.paginate).toBeDefined()
    })
    it("should be defined search and don't return null", () => {
      expect(service.search).toBeDefined()
    })
    it("should be defined update and don't return null", () => {
      let id = util.getString()
      let update = util.getRecordStringUnknown()
      expect(service.update(id, update)).rejects.not.toBeNull()
      expect(service.update).toBeDefined()
    })
    it("should be defined updateByEmail and don't return null", () => {
      let email = util.getString()
      let update = util.getRecordStringUnknown()
      expect(service.updateByEmail(email, update)).rejects.not.toBeNull()
      expect(service.updateByEmail).toBeDefined()
    })
    it("should be defined updateBySubID and don't return null", () => {
      let subId = util.getString()
      let update = util.getRecordStringUnknown()
      expect(service.updateBySubID(subId, update)).rejects.not.toBeNull()
      expect(service.updateBySubID).toBeDefined()
    })
  })
})
