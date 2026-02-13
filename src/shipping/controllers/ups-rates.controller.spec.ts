import { Test, TestingModule } from '@nestjs/testing';
import { UpsRatesController } from './ups-rates.controller';

describe('UpsRatesController', () => {
  let controller: UpsRatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UpsRatesController],
    }).compile();

    controller = module.get<UpsRatesController>(UpsRatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
