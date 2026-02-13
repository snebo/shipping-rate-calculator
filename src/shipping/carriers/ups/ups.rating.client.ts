import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  AxiosLikeError,
  CarrierError,
  isAxiosLikeError,
  TIMEOUT_CODES,
} from '../../errors/carrier-errors';
import { RateProvider } from '../carrier.types';
import { RateRequest } from '../../domain/rate-request';
import { RateQuote } from '../../domain/rate-quote';
import { buildUpsRatingPayload, normalizeUpsRates } from './ups.rate.mapper';
import { UpsAuthService } from './ups.auth.service';
import { UpsRatingResponsePayload } from './ups.types';

@Injectable()
export class UpsRatingClient implements RateProvider {
  carrier = 'ups' as const;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly auth: UpsAuthService,
  ) {}

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    const ratingUrl = this.config.get<string>('UPS_RATING_URL')!;
    const timeoutMs = this.config.get<number>('UPS_HTTP_TIMEOUT_MS', 5000);
    const payload = buildUpsRatingPayload(request);

    const token = await this.auth.getAccessToken();

    try {
      const resp = await firstValueFrom(
        this.http.post<UpsRatingResponsePayload>(ratingUrl, payload, {
          timeout: timeoutMs,
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'json',
          transitional: {
            forcedJSONParsing: true,
            silentJSONParsing: false,
          },
        } as any),
      );

      const payloadData = this.ensureUpsRatingPayload(resp?.data);

      try {
        return normalizeUpsRates(payloadData);
      } catch {
        // If mapper blows up due to unexpected inner fields, treat as bad upstream response
        throw new CarrierError(
          'CARRIER_BAD_RESPONSE',
          'UPS rating returned malformed shipment entries',
          502,
          { carrier: 'ups', raw: resp?.data },
        );
      }
    } catch (err: unknown) {
      if (err instanceof CarrierError) {
        throw err;
      }

      if (!isAxiosLikeError(err)) {
        throw new CarrierError(
          'CARRIER_UNEXPECTED',
          'Unexpected UPS rating error',
          502,
          { carrier: 'ups' },
        );
      }

      if (err.response?.status === 401) {
        const refreshed = await this.auth.forceRefresh();
        return this.retryOnce(ratingUrl, payload, refreshed, timeoutMs);
      }

      throw this.mapUpsRatingError(err);
    }
  }

  private async retryOnce(
    ratingUrl: string,
    payload: unknown,
    token: string,
    timeoutMs: number,
  ): Promise<RateQuote[]> {
    try {
      const resp = await firstValueFrom(
        this.http.post<UpsRatingResponsePayload>(ratingUrl, payload, {
          timeout: timeoutMs,
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'json',
          transitional: {
            forcedJSONParsing: true,
            silentJSONParsing: false,
          },
        } as any),
      );

      const payloadData = this.ensureUpsRatingPayload(resp?.data);

      try {
        return normalizeUpsRates(payloadData);
      } catch {
        throw new CarrierError(
          'CARRIER_BAD_RESPONSE',
          'UPS rating returned malformed shipment entries',
          502,
          { carrier: 'ups', raw: resp?.data },
        );
      }
    } catch (err: unknown) {
      if (err instanceof CarrierError) {
        throw err;
      }

      throw this.mapUpsRatingError(
        isAxiosLikeError(err) ? err : { message: 'Unknown UPS retry error' },
      );
    }
  }

  private mapUpsRatingError(err: AxiosLikeError): CarrierError {
    if (err.code !== undefined && TIMEOUT_CODES.has(err.code)) {
      return new CarrierError(
        'CARRIER_RATE_TIMEOUT',
        'UPS rating request timed out',
        504,
        { carrier: 'ups' },
      );
    }

    const status = err.response?.status;
    const data = err.response?.data;

    if (typeof status === 'number') {
      if (status >= 400 && status < 500) {
        return new CarrierError(
          'CARRIER_UPSTREAM_4XX',
          'UPS rejected the rating request',
          502,
          { carrier: 'ups', upstreamStatus: status, raw: data },
        );
      }
      if (status >= 500) {
        return new CarrierError(
          'CARRIER_UPSTREAM_5XX',
          'UPS rating service error',
          502,
          { carrier: 'ups', upstreamStatus: status, raw: data },
        );
      }
    }

    const rawMessage = err.message ?? err.code ?? 'Unknown UPS rating error';
    return new CarrierError(
      'CARRIER_RATE_FAILED',
      'UPS rating request failed',
      502,
      { carrier: 'ups', raw: data ?? rawMessage },
    );
  }

  private ensureUpsRatingPayload(data: unknown): UpsRatingResponsePayload {
    // Covers malformed JSON that Axios returns as a string
    if (!data || typeof data !== 'object') {
      throw new CarrierError(
        'CARRIER_BAD_RESPONSE',
        'UPS rating returned non-JSON / malformed JSON',
        502,
        { carrier: 'ups', raw: data },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const rr = (data as any).RateResponse;
    if (!rr || typeof rr !== 'object') {
      throw new CarrierError(
        'CARRIER_BAD_RESPONSE',
        'UPS rating returned unexpected payload shape (missing RateResponse)',
        502,
        { carrier: 'ups', raw: data },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!Array.isArray(rr.RatedShipment)) {
      throw new CarrierError(
        'CARRIER_BAD_RESPONSE',
        'UPS rating returned unexpected payload shape (RatedShipment not an array)',
        502,
        { carrier: 'ups', raw: data },
      );
    }

    return data as UpsRatingResponsePayload;
  }
}
