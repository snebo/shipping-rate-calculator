import { Module } from '@nestjs/common';
import { UpsRatesController } from './controllers/ups-rates.controller';

@Module({
  controllers: [UpsRatesController],
})
export class ShippingModule {}
