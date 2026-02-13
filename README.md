# Shipping Carrier Integration Service

A NestJS module that wraps carrier APIs behind a clean, strongly-typed domain interface.

This repository currently implements **UPS Rate Shopping** (rating) and is designed to be **extensible** for:

- Additional carriers (FedEx, USPS, DHL, etc.)
- Additional operations (labels, purchases, tracking, address validation, etc.)

> This project does **not** require working UPS keys or live carrier calls to run tests.  
> All external calls are mocked in integration tests.

---

## What it does

### Rate Shopping

- **Endpoint:** `POST /ups/ups_rates`
- **Accepts:** origin, destination, parcels (dimensions + weight), optional service filters
- **Returns:** normalized rate quotes in internal format

### UPS OAuth 2.0 client credentials

- Token acquisition via UPS OAuth endpoint
- Token caching (reuse while valid)
- Transparent token refresh on expiry
- 401 retry flow (refresh and retry once)

### Strong typing

- Domain request/response models
- Typed carrier client and mapper layers

### Structured, meaningful errors

Every error returned to the caller is normalized into a consistent structure:

- carrier identification (e.g. `ups`)
- upstream status codes (when present)
- machine-readable error codes
- appropriate HTTP status mapping (e.g. 502/504)

### Integration tests (E2E)

Tests validate:

- request payloads built correctly from domain models
- UPS responses parsed + normalized correctly
- token lifecycle works (acquire, reuse, refresh)
- upstream failures produce expected structured errors:
  - 4xx
  - 5xx
  - malformed JSON
  - timeouts

---

## Architecture

The project is structured as a **carrier integration module**:

- **Domain models** (carrier-agnostic)
  - `RateRequest`, `RateQuote`, etc.
- **Carrier clients** (carrier-specific adapters)
  - `UpsRatingClient` implements `RateProvider`
  - `UpsAuthService` manages OAuth tokens (cache + refresh)
- **Mappers**
  - Build carrier payloads from domain types
  - Normalize carrier responses into internal types
- **Errors**
  - Shared structured error types & mapping logic

This separation makes it easy to add new carriers without leaking carrier-specific concerns into the domain layer.

---

## API

### `POST /ups/ups_rates`

#### Request body (example)

```json
{
  "origin": {
    "address1": "1 Main",
    "city": "Atlanta",
    "postalCode": "30301",
    "countryCode": "US"
  },
  "destination": {
    "address1": "2 Main",
    "city": "NYC",
    "postalCode": "10001",
    "countryCode": "US"
  },
  "parcels": [
    {
      "dimensions": { "lengthCm": 10, "widthCm": 20, "heightCm": 30 },
      "weight": { "weightKg": 2 }
    }
  ]
}
```

#### Successful response (normalized)

```json
{
  "quotes": [
    {
      "carrier": "ups",
      "serviceCode": "03",
      "serviceName": "UPS Ground",
      "totalCharge": { "currency": "USD", "amount": "12.34" },
      "estimatedDeliveryDate": "2026-02-15"
    }
  ]
}
```

#### Error response (structured)

```json
{
  "error": {
    "code": "CARRIER_UPSTREAM_4XX",
    "details": {
      "carrier": "ups",
      "upstreamStatus": 400
    }
  }
}
```

Common error codes include:

- `CARRIER_UPSTREAM_4XX`
- `CARRIER_UPSTREAM_5XX`
- `CARRIER_RATE_TIMEOUT`
- `CARRIER_BAD_RESPONSE`
- `CARRIER_RATE_FAILED`
- `CARRIER_UNEXPECTED`

---

## Local setup

### Requirements

- Node.js (LTS recommended)
- npm

### Install

```bash
npm install
```

### Environment variables

Copy the example file:

```bash
cp .env.example .env
```

> Values do not need to be real for tests; external calls are mocked.

---

## Running tests

### Unit tests

```bash
npm test
```

### E2E / integration tests

```bash
npm run test:e2e
```

E2E tests mock all UPS HTTP interactions (OAuth + rating) and validate behavior end-to-end.

---

## Extending the module

### Adding another carrier (example approach)

1. Implement the `RateProvider` interface for the new carrier:

```ts
@Injectable()
export class FedexRatingClient implements RateProvider {
  carrier = 'fedex' as const;

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    // 1) build FedEx payload from RateRequest
    // 2) call FedEx API
    // 3) normalize to RateQuote[]
    return [];
  }
}
```

2. Add it to your carrier module providers:

- register the provider
- register it in a resolver/factory (so controllers can route to it)

3. Add a controller route such as:

- `POST /fedex/rates`

4. Add E2E tests that mirror UPS tests:

- payload creation
- normalization
- auth lifecycle (if applicable)
- 4xx/5xx/malformed/timeout error mappings

---

## Future operations

This module is intentionally designed to expand beyond rating:

- **Label creation / purchase**
- **Tracking**
- **Address validation**
- **Pickup scheduling**
- **Returns**

The recommended pattern is the same:

- define domain interfaces + types
- implement per-carrier adapters
- normalize responses into internal types
- write E2E tests with mocked upstream calls

---

## Notes

- External networking is disabled in tests (only localhost allowed)
- Carrier calls are mocked using HTTP interceptors
- The service focuses on correctness, reliability, and clarity:
  - Strong typing
  - Structured errors
  - Token lifecycle correctness
  - Realistic integration tests
