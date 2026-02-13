import { Address } from './address';
import { Parcel } from './parcel';

export interface RateRequest {
  origin: Address;
  destination: Address;
  parcels: Parcel[]; // array of parcels to handle multiple packages
  serviceLevels?: string[]; // carrier specific codes
}
