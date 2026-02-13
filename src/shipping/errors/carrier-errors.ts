export type CarrierErrorCode =
  | 'CARRIER_AUTH_FAILED'
  | 'CARRIER_AUTH_TIMEOUT'
  | 'CARRIER_RATE_TIMEOUT'
  | 'CARRIER_RATE_FAILED'
  | 'CARRIER_BAD_RESPONSE'
  | 'CARRIER_UPSTREAM_4XX'
  | 'CARRIER_UPSTREAM_5XX'
  | 'CARRIER_UNEXPECTED';

export interface CarrierErrorDetails {
  carrier: string;
  upstreamStatus?: number;
  upstreamMessage?: string;
  requestId?: string;
  raw?: unknown;
}

export class CarrierError extends Error {
  constructor(
    public readonly code: CarrierErrorCode,
    message: string,
    public readonly httpStatus: number,
    public readonly details: CarrierErrorDetails,
  ) {
    super(message);
  }
}
