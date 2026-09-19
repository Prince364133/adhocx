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
    expect(service.calculateDriverRate(VehicleType.HATCHBACK)).toBe(500);
    expect(service.calculateDriverRate(VehicleType.SEDAN)).toBe(800);
    expect(service.calculateDriverRate(VehicleType.SUV)).toBe(1400);
    expect(service.calculateDriverRate(VehicleType.TEMPO_TRAVELLER)).toBe(3200);
    expect(service.calculateDriverRate(VehicleType.BUS)).toBe(6500);
  });

  it('should fallback to 800 (Sedan base) for unknown vehicle type', () => {
    expect(service.calculateDriverRate('UNKNOWN' as any)).toBe(800);
  });
});
