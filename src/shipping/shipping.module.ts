import { Module } from '@nestjs/common';
import { UpsRatesController } from './controllers/ups-rates.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { shippingEnvSchema } from './config/shipping.config';

@Module({
  imports: [
    CacheModule.register(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: shippingEnvSchema,
      envFilePath: '.env.example',
    }),
  ],
  controllers: [UpsRatesController],
})
export class ShippingModule {}
