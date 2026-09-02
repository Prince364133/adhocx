import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from '../src/modules/pricing/pricing.service';
import { VehicleType } from '@adhocx/contracts';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingService],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate correct base rates per vehicle type', () => {
    expect(service.calculateDriverRate(VehicleType.HATCHBACK)).toBe(1200);
    expect(service.calculateDriverRate(VehicleType.SEDAN)).toBe(1500);
    expect(service.calculateDriverRate(VehicleType.SUV)).toBe(2000);
    expect(service.calculateDriverRate(VehicleType.TEMPO_TRAVELLER)).toBe(3500);
    expect(service.calculateDriverRate(VehicleType.BUS)).toBe(5000);
  });

  it('should fallback to 1500 for unknown vehicle type', () => {
    expect(service.calculateDriverRate('UNKNOWN' as any)).toBe(1500);
  });
});
