import { Test, TestingModule } from '@nestjs/testing';
import { ActionTokensService } from './action-tokens.service';

describe('ActionTokensService', () => {
  let service: ActionTokensService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActionTokensService],
    }).compile();

    service = module.get<ActionTokensService>(ActionTokensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
