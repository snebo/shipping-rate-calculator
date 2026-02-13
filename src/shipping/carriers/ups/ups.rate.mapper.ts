import { RateRequest } from '../../domain/rate-request';
import { RateQuote } from '../../domain/rate-quote';
import { UpsRatingRequestPayload, UpsRatingResponsePayload } from './ups.types';

const UPS_DIM_UNIT = 'CM';
const UPS_WEIGHT_UNIT = 'KGS';

function serviceNameFromCode(code: string): string {
  // minimal example; expand as needed
  switch (code) {
    case '03':
      return 'UPS Ground';
    case '02':
      return 'UPS 2nd Day Air';
    case '01':
      return 'UPS Next Day Air';
    default:
      return `UPS Service ${code}`;
  }
}

export function buildUpsRatingPayload(
  domain: RateRequest,
): UpsRatingRequestPayload {
  return {
    RateRequest: {
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
        Package: domain.parcels.map((p) => ({
          Dimensions: {
            UnitOfMeasurement: { Code: UPS_DIM_UNIT },
            Length: String(p.dimensions.lengthCm),
            Width: String(p.dimensions.widthCm),
            Height: String(p.dimensions.heightCm),
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
  const rated = resp?.RateResponse?.RatedShipment;
  if (!Array.isArray(rated)) return [];

  return rated.map((s) => ({
    carrier: 'ups',
    serviceCode: s.Service.Code,
    serviceName: s.Service.Description ?? serviceNameFromCode(s.Service.Code),
    totalCharge: {
      currency: s.TotalCharges.CurrencyCode,
      amount: s.TotalCharges.MonetaryValue,
    },
    estimatedDeliveryDate: s.TimeInTransit?.EstimatedArrival?.Date,
  }));
}
