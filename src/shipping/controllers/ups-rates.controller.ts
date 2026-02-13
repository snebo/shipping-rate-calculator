import {
  Body,
  Controller,
  Post,
  UseFilters,
  ValidationPipe,
} from '@nestjs/common';
import { CarrierRegistry } from '../carriers/carrier.registry';
import { RateRequestDto } from '../dto/rate-request.dto';
import { CarrierExceptionFilter } from '../errors/carrier-exception.filter';
import { RateRequest } from '../domain/rate-request';

@Controller('ups')
@UseFilters(new CarrierExceptionFilter())
export class UpsRatesController {
  constructor(private readonly registry: CarrierRegistry) {}

  @Post('ups_rates')
  async getUpsRates(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: RateRequestDto,
  ) {
    const domain: RateRequest = {
      origin: dto.origin,
      destination: dto.destination,
      parcels: dto.parcels,
      serviceLevels: dto.serviceLevels,
    };

    const ups = this.registry.getRateProvider('ups');
    const quotes = await ups.getRates(domain);

    // optional filtering by serviceLevels in your own layer:
    const filtered = dto.serviceLevels?.length
      ? quotes.filter(
          (q) =>
            dto.serviceLevels!.includes(q.serviceCode) ||
            dto.serviceLevels!.includes(q.serviceName),
        )
      : quotes;

    return { quotes: filtered };
  }
}
