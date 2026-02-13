import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { CarrierError, isAxiosLikeError } from '../../errors/carrier-errors';
import { UpsOAuthTokenResponse } from './ups.types';

type CachedToken = { token: string; expiresAtMs: number };

@Injectable()
export class UpsAuthService {
  private readonly cacheKey = 'ups:oauthToken';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private nowMs() {
    return Date.now();
  }

  async getAccessToken(): Promise<string> {
    const skewSeconds = this.config.get<number>('UPS_TOKEN_SKEW_SECONDS', 30);
    const cached = await this.cache.get(this.cacheKey);

    if (
      cached &&
      (cached as CachedToken).expiresAtMs - this.nowMs() > skewSeconds * 1000
    ) {
      return (cached as CachedToken).token;
    }

    return this.acquireAndCacheToken();
  }

  async forceRefresh(): Promise<string> {
    return this.acquireAndCacheToken();
  }

  private async acquireAndCacheToken(): Promise<string> {
    const tokenUrl = this.config.get<string>('UPS_OAUTH_TOKEN_URL')!;
    const clientId = this.config.get<string>('UPS_CLIENT_ID')!;
    const clientSecret = this.config.get<string>('UPS_CLIENT_SECRET')!;
    const timeoutMs = this.config.get<number>('UPS_HTTP_TIMEOUT_MS', 5000);

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
    }).toString();

    try {
      const obs = this.http.post<UpsOAuthTokenResponse>(tokenUrl, body, {
        timeout: timeoutMs,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: { username: clientId, password: clientSecret },
      });

      const { data } = await firstValueFrom(obs);

      if (!data?.access_token || !data?.expires_in) {
        throw new CarrierError(
          'CARRIER_BAD_RESPONSE',
          'UPS auth returned an unexpected payload',
          502,
          { carrier: 'ups', raw: data },
        );
      }

      const expiresAtMs = this.nowMs() + data.expires_in * 1000;

      await this.cache.set(
        this.cacheKey,
        { token: data.access_token, expiresAtMs },
        data.expires_in,
      );

      return data.access_token;
    } catch (err: unknown) {
      if (!isAxiosLikeError(err)) {
        throw new CarrierError(
          'CARRIER_UNEXPECTED',
          'Unexpected UPS auth error',
          502,
          { carrier: 'ups', raw: String(err) },
        );
      }

      // timeout
      if (err.code === 'ECONNABORTED') {
        throw new CarrierError(
          'CARRIER_AUTH_TIMEOUT',
          'UPS auth request timed out',
          504,
          { carrier: 'ups' },
        );
      }

      // upstream status
      const status = err.response?.status;
      const upstreamData = err.response?.data;

      if (status) {
        throw new CarrierError('CARRIER_AUTH_FAILED', 'UPS auth failed', 502, {
          carrier: 'ups',
          upstreamStatus: status,
          raw: upstreamData,
        });
      }

      throw new CarrierError(
        'CARRIER_UNEXPECTED',
        'Unexpected UPS auth error',
        502,
        {
          carrier: 'ups',
          raw: String(err.message ?? err.code ?? 'Unknown UPS auth error'),
        },
      );
    }
  }
}
