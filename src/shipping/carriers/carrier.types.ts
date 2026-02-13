import { RateRequest } from '../domain/rate-request';
import { RateQuote } from '../domain/rate-quote';

export type CarrierKey = 'ups' | (string & {});

export interface RateProvider {
  carrier: CarrierKey;
  getRates(request: RateRequest): Promise<RateQuote[]>;
}

/**
 * Future growth idea: add more ops
 * export interface LabelProvider { createLabel(...) }
 * export interface TrackingProvider { track(...) }
 * export interface AddressValidationProvider { validate(...) }
 */
