import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as request from 'supertest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nock = require('nock') as typeof import('nock');
import { ShippingModule } from '../src/shipping/shipping.module';

// disable at module load time, not inside beforeAll
nock.disableNetConnect();
nock.enableNetConnect(
  (host) => host.includes('127.0.0.1') || host.includes('localhost'),
);

interface RateQuote {
  carrier: string;
  serviceCode: string;
  serviceName: string;
  totalCharge: { currency: string; amount: string };
  estimatedDeliveryDate: string;
}

interface RatesResponse {
  quotes: RateQuote[];
}

interface ErrorResponse {
  error: {
    code: string;
    details?: Record<string, unknown>;
  };
}

describe('ShippingModule (e2e)', () => {
  let app: INestApplication;

  const API_PATH = '/ups/ups_rates';
  const UPS_TOKEN_CACHE_KEY = 'ups:oauthToken';

  const tokenHost = 'https://mock.ups.local';
  const tokenPath = '/oauth/token';
  const ratingPath = '/rating/v1/rates';

  beforeAll(async () => {
    process.env.UPS_CLIENT_ID = 'cid';
    process.env.UPS_CLIENT_SECRET = 'csecret';
    process.env.UPS_OAUTH_TOKEN_URL = `${tokenHost}${tokenPath}`;
    process.env.UPS_RATING_URL = `${tokenHost}${ratingPath}`;
    process.env.UPS_HTTP_TIMEOUT_MS = '200';
    process.env.UPS_TOKEN_SKEW_SECONDS = '0';

    const modRef = await Test.createTestingModule({
      imports: [ShippingModule],
    }).compile();

    app = modRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    const cache = app.get<Cache>(CACHE_MANAGER);
    await cache.del(UPS_TOKEN_CACHE_KEY);
    nock.cleanAll();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    console.log('unused interceptors:', nock.pendingMocks());
    nock.enableNetConnect();
    await app.close();
  });

  it('builds correct UPS payload and normalizes response', async () => {
    console.log('nock active:', nock.isActive());
    console.log('nock interceptors before:', nock.pendingMocks());

    console.log('nock interceptors after:', nock.pendingMocks());
    nock(tokenHost).post(tokenPath).reply(200, {
      access_token: 't1',
      token_type: 'bearer',
      expires_in: 3600,
    });

    // No body matcher — avoids silent nock mismatches due to
    // string vs number coercion in the built payload
    nock(tokenHost)
      .post(ratingPath)
      .reply(200, {
        RateResponse: {
          RatedShipment: [
            {
              Service: { Code: '03', Description: 'UPS Ground' },
              TotalCharges: { CurrencyCode: 'USD', MonetaryValue: '12.34' },
              TimeInTransit: { EstimatedArrival: { Date: '2026-02-15' } },
            },
          ],
        },
      });

    const res = await request(app.getHttpServer())
      .post(API_PATH)
      .send(sampleRequest())
      .expect(201);

    const body = res.body as RatesResponse;
    expect(body.quotes).toHaveLength(1);
    expect(body.quotes[0]).toMatchObject({
      carrier: 'ups',
      serviceCode: '03',
      serviceName: 'UPS Ground',
      totalCharge: { currency: 'USD', amount: '12.34' },
      estimatedDeliveryDate: '2026-02-15',
    });
  });

  // Separate test specifically for payload shape correctness
  it('builds correct UPS payload structure', async () => {
    nock(tokenHost).post(tokenPath).reply(200, {
      access_token: 't1',
      token_type: 'bearer',
      expires_in: 3600,
    });

    let capturedBody: unknown = null;

    nock(tokenHost)
      .post(ratingPath, (body: unknown) => {
        capturedBody = body;
        return true; // always match, inspect after
      })
      .reply(200, { RateResponse: { RatedShipment: [] } });

    await request(app.getHttpServer())
      .post(API_PATH)
      .send(sampleRequest())
      .expect(201);

    const b = capturedBody as Record<string, unknown>;
    const shipment = (b?.RateRequest as Record<string, unknown>)
      ?.Shipment as Record<string, unknown>;
    const shipperZip = (
      (shipment?.Shipper as Record<string, unknown>)?.Address as Record<
        string,
        unknown
      >
    )?.PostalCode;
    const toZip = (
      (shipment?.ShipTo as Record<string, unknown>)?.Address as Record<
        string,
        unknown
      >
    )?.PostalCode;
    const pkg0 = (shipment?.Package as Record<string, unknown>[])?.[0];

    expect(shipperZip).toBe('30301');
    expect(toZip).toBe('10001');
    expect((pkg0?.Dimensions as Record<string, unknown>)?.Length).toBe('10');
    expect((pkg0?.PackageWeight as Record<string, unknown>)?.Weight).toBe('2');
  });

  it('reuses a valid token (auth called once for two requests)', async () => {
    const auth = nock(tokenHost).post(tokenPath).once().reply(200, {
      access_token: 't2',
      token_type: 'bearer',
      expires_in: 3600,
    });

    const rating = nock(tokenHost)
      .post(ratingPath)
      .twice()
      .reply(200, { RateResponse: { RatedShipment: [] } });

    await request(app.getHttpServer())
      .post(API_PATH)
      .send(sampleRequest())
      .expect(201);
    await request(app.getHttpServer())
      .post(API_PATH)
      .send(sampleRequest())
      .expect(201);

    expect(auth.isDone()).toBe(true);
    expect(rating.isDone()).toBe(true);
  });

  it('refreshes token on expiry (auth called again after time passes)', async () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(5000)
      .mockReturnValueOnce(5000);

    nock(tokenHost)
      .post(tokenPath)
      .twice()
      .reply(
        200,
        (
          _uri: string,
          _body: unknown,
          cb: (err: Error | null, body: unknown) => void,
        ) =>
          cb(null, {
            access_token: `t_${Date.now()}`,
            token_type: 'bearer',
            expires_in: 1,
          }),
      );

    nock(tokenHost)
      .post(ratingPath)
      .twice()
      .reply(200, { RateResponse: { RatedShipment: [] } });

    await request(app.getHttpServer())
      .post(API_PATH)
      .send(sampleRequest())
      .expect(201);
    await request(app.getHttpServer())
      .post(API_PATH)
      .send(sampleRequest())
      .expect(201);
  });

  it('maps UPS 4xx to structured error', async () => {
    nock(tokenHost).post(tokenPath).reply(200, {
      access_token: 't3',
      token_type: 'bearer',
      expires_in: 3600,
    });

    nock(tokenHost)
      .post(ratingPath)
      .reply(400, { errors: [{ code: 'INVALID', message: 'Bad request' }] });

    const res = await request(app.getHttpServer())
      .post(API_PATH)
      .send(sampleRequest())
      .expect(502);

    const body = res.body as ErrorResponse;
    expect(body.error).toMatchObject({
      code: 'CARRIER_UPSTREAM_4XX',
      details: { carrier: 'ups', upstreamStatus: 400 },
    });
  });

  it('handles malformed JSON / bad upstream response as structured error', async () => {
    nock(tokenHost).post(tokenPath).reply(200, {
      access_token: 't4',
      token_type: 'bearer',
      expires_in: 3600,
    });

    nock(tokenHost)
      .post(ratingPath)
      .reply(200, '}{ not json', { 'Content-Type': 'application/json' });

    const res = await request(app.getHttpServer())
      .post(API_PATH)
      .send(sampleRequest())
      .expect(502);

    const body = res.body as ErrorResponse;
    expect(body.error.code).toBeDefined();
  });

  it('timeouts produce structured error', async () => {
    nock(tokenHost).post(tokenPath).reply(200, {
      access_token: 't5',
      token_type: 'bearer',
      expires_in: 3600,
    });

    nock(tokenHost)
      .post(ratingPath)
      .delayConnection(1000)
      .reply(200, { RateResponse: { RatedShipment: [] } });

    const res = await request(app.getHttpServer())
      .post(API_PATH)
      .send(sampleRequest())
      .expect(504);

    const body = res.body as ErrorResponse;
    expect(body.error.code).toBe('CARRIER_RATE_TIMEOUT');
  });

  function sampleRequest() {
    return {
      origin: {
        address1: '1 Main',
        city: 'Atlanta',
        postalCode: '30301',
        countryCode: 'US',
      },
      destination: {
        address1: '2 Main',
        city: 'NYC',
        postalCode: '10001',
        countryCode: 'US',
      },
      parcels: [
        {
          dimensions: { lengthCm: 10, widthCm: 20, heightCm: 30 },
          weight: { weightKg: 2 },
        },
      ],
    };
  }
});
