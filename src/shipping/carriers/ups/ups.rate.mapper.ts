import { RateRequest } from '../../domain/rate-request';
import { RateQuote } from '../../domain/rate-quote';
import { UpsRatingRequestPayload, UpsRatingResponsePayload } from './ups.types';

const UPS_DIM_UNIT = 'CM';
const UPS_WEIGHT_UNIT = 'KGS';

function serviceNameFromCode(code: string): string {
  switch (code) {
    case '03':
      return 'UPS Ground';
    case '02':
      return 'UPS 2nd Day Air';
    case '01':
      return 'UPS Next Day Air';
    case '14':
      return 'UPS Next Day Air Early';
    case '13':
      return 'UPS Next Day Air Saver';
    case '59':
      return 'UPS 2nd Day Air A.M.';
    case '12':
      return 'UPS 3 Day Select';
    default:
      return `UPS Service ${code}`;
  }
}

export function buildUpsRatingPayload(
  domain: RateRequest,
): UpsRatingRequestPayload {
  return {
    RateRequest: {
      Request: {
        TransactionReference: {
          CustomerContext: 'RateRequest',
        },
      },
      Shipment: {
        Shipper: {
          Address: {
            PostalCode: domain.origin.postalCode,
            CountryCode: domain.origin.countryCode,
          },
        },
        ShipTo: {
          Address: {
            PostalCode: domain.destination.postalCode,
            CountryCode: domain.destination.countryCode,
          },
        },
        // ShipFrom is required when different from Shipper
        ShipFrom: {
          Address: {
            PostalCode: domain.origin.postalCode,
            CountryCode: domain.origin.countryCode,
          },
        },
        Package: domain.parcels.map((p) => ({
          PackagingType: {
            Code: '02',
          },
          Dimensions: {
            UnitOfMeasurement: { Code: UPS_DIM_UNIT },
            Length: String(Math.ceil(p.dimensions.lengthCm)),
            Width: String(Math.ceil(p.dimensions.widthCm)),
            Height: String(Math.ceil(p.dimensions.heightCm)),
          },
          PackageWeight: {
            UnitOfMeasurement: { Code: UPS_WEIGHT_UNIT },
            Weight: String(p.weight.weightKg),
          },
        })),
      },
    },
  };
}

export function normalizeUpsRates(resp: UpsRatingResponsePayload): RateQuote[] {
  const raw = resp?.RateResponse?.RatedShipment;
  if (!raw) return [];
  const rated = Array.isArray(raw) ? raw : [raw];

  return rated.map((s) => ({
    carrier: 'ups' as const,
    serviceCode: s.Service.Code,
    serviceName: s.Service.Description || serviceNameFromCode(s.Service.Code),
    totalCharge: {
      currency: s.TotalCharges.CurrencyCode,
      amount: s.TotalCharges.MonetaryValue,
    },
    estimatedDeliveryDate: s.TimeInTransit?.EstimatedArrival?.Date,
  }));
}
