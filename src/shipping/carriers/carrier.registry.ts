import { Injectable } from '@nestjs/common';
import { CarrierKey, RateProvider } from './carrier.types';

@Injectable()
export class CarrierRegistry {
  private readonly rateProviders = new Map<CarrierKey, RateProvider>();

  registerRateProvider(provider: RateProvider) {
    this.rateProviders.set(provider.carrier, provider);
  }

  getRateProvider(carrier: CarrierKey): RateProvider {
    const p = this.rateProviders.get(carrier);
    if (!p) {
      // could be a structured error too; keeping simple
      throw new Error(`No rate provider registered for carrier: ${carrier}`);
    }
    return p;
  }
}
