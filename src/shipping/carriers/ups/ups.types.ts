export interface UpsOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
}

interface UpsAddress {
  PostalCode: string;
  CountryCode: string;
  AddressLine?: string | string[];
  City?: string;
  StateProvinceCode?: string;
}

interface UpsNamedParty {
  Name?: string;
  ShipperNumber?: string; // required for production billing
  Address: UpsAddress;
}

interface UpsPackagingType {
  Code: string; // '02' = Customer Supplied Package
  Description?: string;
}

interface UpsUnitOfMeasurement {
  Code: string; // 'CM' | 'IN' | 'KGS' | 'LBS'
  Description?: string;
}

interface UpsDimensions {
  UnitOfMeasurement: UpsUnitOfMeasurement;
  Length: string;
  Width: string;
  Height: string;
}

interface UpsPackageWeight {
  UnitOfMeasurement: UpsUnitOfMeasurement;
  Weight: string;
}

interface UpsPackage {
  PackagingType: UpsPackagingType;
  Dimensions: UpsDimensions;
  PackageWeight: UpsPackageWeight;
}

interface UpsService {
  Code: string;
  Description?: string;
}

interface UpsTransactionReference {
  CustomerContext?: string;
  TransactionIdentifier?: string;
}

interface UpsRequest {
  TransactionReference?: UpsTransactionReference;
}

interface UpsShipment {
  Shipper: UpsNamedParty;
  ShipTo: UpsNamedParty;
  ShipFrom?: UpsNamedParty; // required when origin differs from shipper account
  Service?: UpsService; // omit for shop (all services); include to request one
  Package: UpsPackage[];
  NumOfPieces?: string;
}

export interface UpsRatingRequestPayload {
  RateRequest: {
    Request?: UpsRequest;
    Shipment: UpsShipment;
  };
}

// ── Response

interface UpsTotalCharges {
  CurrencyCode: string;
  MonetaryValue: string;
}

interface UpsEstimatedArrival {
  Date?: string; // 'YYYY-MM-DD'
  Time?: string; // 'HH:MM:SS'
  DayOfWeek?: string;
}

interface UpsTimeInTransit {
  EstimatedArrival?: UpsEstimatedArrival;
  ServiceSummary?: {
    Service?: UpsService;
    EstimatedArrival?: UpsEstimatedArrival;
  };
}

interface UpsRatedShipment {
  Service: UpsService;
  TotalCharges: UpsTotalCharges;
  TimeInTransit?: UpsTimeInTransit;
  BillingWeight?: {
    UnitOfMeasurement: UpsUnitOfMeasurement;
    Weight: string;
  };
  RatedPackage?: Array<{
    TotalCharges: UpsTotalCharges;
    Weight: string;
  }>;
}

export interface UpsRatingResponsePayload {
  RateResponse: {
    Response?: {
      ResponseStatus?: { Code: string; Description?: string };
      TransactionReference?: UpsTransactionReference;
    };
    RatedShipment: UpsRatedShipment | UpsRatedShipment[];
  };
}
