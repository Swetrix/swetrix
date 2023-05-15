import { Test, TestingModule } from '@nestjs/testing'
import { PingController } from './ping.controller'

describe('PingController', () => {
  let controller: PingController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PingController],
    }).compile()

    controller = module.get<PingController>(PingController)
  })

  describe('root', () => {
    it('should be defined controller', () => {
      expect(controller).toBeDefined()
    })
  })
  describe('ping.controller definding', () => {
    it('should be defined with get()', () => {
      expect(controller.get).toBeDefined()
    })
  })
})
