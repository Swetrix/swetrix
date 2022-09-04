import { Test, TestingModule } from '@nestjs/testing'
import { CdnService } from './cdn.service'

describe('CdnService', () => {
  let service: CdnService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CdnService],
    }).compile()

    service = module.get<CdnService>(CdnService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
