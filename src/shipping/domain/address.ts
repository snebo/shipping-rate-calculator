export type CountryCode = string;

export interface Address {
  name?: string;
  company?: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  stateProvince?: string;
  postalCode: string;
  countryCode: CountryCode; // for example "U.S"
}
