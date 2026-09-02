import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class VehiclesService {
  constructor(private readonly db: DatabaseService) {}

  async findByDriver(driverId: string) {
    return this.db.vehicle.findMany({
      where: { driverId },
    });
  }
}
