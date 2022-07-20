import { Test, TestingModule } from '@nestjs/testing';
import { TaskManagerService } from './task-manager.service';

describe('TaskManagerService', () => {
  let service: TaskManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskManagerService],
    }).compile();

    service = module.get<TaskManagerService>(TaskManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
