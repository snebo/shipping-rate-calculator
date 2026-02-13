export interface UpsOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
}

export interface UpsRatingRequestPayload {
  RateRequest: {
    Shipment: {
      Shipper: { Address: { PostalCode: string; CountryCode: string } };
      ShipTo: { Address: { PostalCode: string; CountryCode: string } };
      Package: Array<{
        Dimensions: {
          UnitOfMeasurement: { Code: string };
          Length: string;
          Width: string;
          Height: string;
        };
        PackageWeight: { UnitOfMeasurement: { Code: string }; Weight: string };
      }>;
    };
  };
}

export interface UpsRatingResponsePayload {
  RateResponse: {
    RatedShipment: Array<{
      Service: { Code: string; Description?: string };
      TotalCharges: { CurrencyCode: string; MonetaryValue: string };
      TimeInTransit?: { EstimatedArrival?: { Date?: string } };
    }>;
  };
}
