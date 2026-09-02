import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateRequirementDto,
  RequestOtpDto,
  VerifyOtpDto,
  RejectDriverKycDto,
  VehicleType,
} from '../src';

describe('Contracts DTO Validation Tests', () => {
  it('should validate RequestOtpDto correctly', async () => {
    const validDto = plainToInstance(RequestOtpDto, { phone: '+919876543210' });
    const errors = await validate(validDto);
    expect(errors.length).toBe(0);

    const invalidDto = plainToInstance(RequestOtpDto, {});
    const invalidErrors = await validate(invalidDto);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });

  it('should validate VerifyOtpDto length requirements', async () => {
    const validDto = plainToInstance(VerifyOtpDto, {
      requestId: 'req-123',
      phone: '+919876543210',
      otp: '123456',
    });
    const errors = await validate(validDto);
    expect(errors.length).toBe(0);

    const invalidDto = plainToInstance(VerifyOtpDto, {
      requestId: 'req-123',
      phone: '+919876543210',
      otp: '12', // too short
    });
    const invalidErrors = await validate(invalidDto);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });

  it('should validate CreateRequirementDto vehicle type and quantity', async () => {
    const validDto = plainToInstance(CreateRequirementDto, {
      vehicleType: VehicleType.SEDAN,
      quantity: 5,
      pickupLocation: { latitude: 28.6139, longitude: 77.2090, address: 'Delhi' },
      dropLocation: { latitude: 28.4595, longitude: 77.0266, address: 'Gurgaon' },
      reportingTime: '2026-09-02T10:00:00Z',
      ratePerVehicle: 1500,
    });
    const errors = await validate(validDto);
    expect(errors.length).toBe(0);

    const invalidDto = plainToInstance(CreateRequirementDto, {
      vehicleType: 'INVALID_TYPE',
      quantity: 0, // must be at least 1
      reportingTime: 'not-a-date',
      ratePerVehicle: -100,
    });
    const invalidErrors = await validate(invalidDto);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });

  it('should require mandatory reason on RejectDriverKycDto', async () => {
    const valid = plainToInstance(RejectDriverKycDto, { reason: 'DL expired and invalid RC' });
    const validErrors = await validate(valid);
    expect(validErrors.length).toBe(0);

    const invalid = plainToInstance(RejectDriverKycDto, {});
    const invalidErrors = await validate(invalid);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });
});
