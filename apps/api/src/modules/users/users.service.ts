import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findById(id: string) {
    return this.db.user.findUnique({
      where: { id },
      include: { vendor: true, driver: true },
    });
  }

  async findByPhone(phone: string) {
    return this.db.user.findUnique({
      where: { phone },
      include: { vendor: true, driver: true },
    });
  }
}
