import { Module, OnModuleInit } from '@nestjs/common';
import { UpsRatesController } from './controllers/ups-rates.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { shippingEnvSchema } from './config/shipping.config';
import { HttpModule } from '@nestjs/axios';
import { CarrierRegistry } from './carriers/carrier.registry';
import { UpsAuthService } from './carriers/ups/ups.auth.service';
import { UpsRatingClient } from './carriers/ups/ups.rating.client';

@Module({
  imports: [
    HttpModule,
    CacheModule.register(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: shippingEnvSchema,
      envFilePath: '.env.example',
    }),
  ],
  controllers: [UpsRatesController],
  providers: [CarrierRegistry, UpsAuthService, UpsRatingClient],
  exports: [CarrierRegistry],
})
export class ShippingModule implements OnModuleInit {
  constructor(
    private readonly registry: CarrierRegistry,
    private readonly upsRates: UpsRatingClient,
  ) {}

  onModuleInit() {
    this.registry.registerRateProvider(this.upsRates);
  }
}
