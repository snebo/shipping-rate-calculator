export interface DimensionsCm {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface WeightKg {
  weightKg: number;
}

export interface Parcel {
  dimensions: DimensionsCm;
  weight: WeightKg;
}
