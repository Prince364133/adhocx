import { DriverAggregate } from '../aggregates/driver.aggregate';
import { VehicleAggregate } from '../aggregates/vehicle.aggregate';

export interface IDriverRepository {
  findById(id: string): Promise<DriverAggregate | null>;
  findByUserId(userId: string): Promise<DriverAggregate | null>;
  save(driver: DriverAggregate): Promise<void>;
  findOnlineDriversInH3Cells(h3Cells: string[]): Promise<DriverAggregate[]>;
}

export interface IVehicleRepository {
  findById(id: string): Promise<VehicleAggregate | null>;
  findByDriverId(driverId: string): Promise<VehicleAggregate[]>;
  save(vehicle: VehicleAggregate): Promise<void>;
}

