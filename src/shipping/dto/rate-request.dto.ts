import {
  IsArray,
  IsISO31661Alpha2,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsString() address1!: string;
  @IsOptional() @IsString() address2?: string;
  @IsString() city!: string;
  @IsOptional() @IsString() stateProvince?: string;
  @IsString() postalCode!: string;
  @IsISO31661Alpha2() countryCode!: string;
}

class DimensionsDto {
  @IsNumber() @Min(0.1) lengthCm!: number;
  @IsNumber() @Min(0.1) widthCm!: number;
  @IsNumber() @Min(0.1) heightCm!: number;
}

class WeightDto {
  @IsNumber() @Min(0.01) weightKg!: number;
}

class ParcelDto {
  @ValidateNested() @Type(() => DimensionsDto) dimensions!: DimensionsDto;
  @ValidateNested() @Type(() => WeightDto) weight!: WeightDto;
}

export class RateRequestDto {
  @ValidateNested() @Type(() => AddressDto) origin!: AddressDto;
  @ValidateNested() @Type(() => AddressDto) destination!: AddressDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ParcelDto)
  parcels!: ParcelDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceLevels?: string[];
}
