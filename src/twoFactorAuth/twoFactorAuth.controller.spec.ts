import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorAuthController } from './twoFactorAuth.controller';

describe('TwoFactorAuthController', () => {
  let controller: TwoFactorAuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwoFactorAuthController],
    }).compile();

    controller = module.get<TwoFactorAuthController>(TwoFactorAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
