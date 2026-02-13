// ups-rates.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { UpsRatesController } from './ups-rates.controller';
import { CarrierRegistry } from '../carriers/carrier.registry';

describe('UpsRatesController', () => {
  let controller: UpsRatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UpsRatesController],
      providers: [
        {
          provide: CarrierRegistry,
          useValue: {
            // mock only the methods your controller actually calls
            getProvider: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UpsRatesController>(UpsRatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
