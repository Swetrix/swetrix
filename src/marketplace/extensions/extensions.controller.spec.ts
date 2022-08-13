import { Test, TestingModule } from '@nestjs/testing'
import { ExtensionsController } from './extensions.controller'

describe('ExtensionsController', () => {
  let controller: ExtensionsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExtensionsController],
    }).compile()

    controller = module.get<ExtensionsController>(ExtensionsController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
