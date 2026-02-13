export interface Money {
  currency: string; // USD
  amount: string;
}

export interface RateQuote {
  carrier: string; // "ups"
  serviceCode: string; // "03"
  serviceName: string;
  totalCharge: Money;
  estimatedDeliveryDate?: string; // yyyy-mm-dd
}
