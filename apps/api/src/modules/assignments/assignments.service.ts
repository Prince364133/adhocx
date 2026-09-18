import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AssignmentStatus,
  validateAssignmentTransition,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AssignmentsService {
  constructor(private readonly db: DatabaseService) {}

  async getAssignment(id: string) {
    const assignment = await this.db.assignment.findUnique({ where: { id } });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    return assignment;
  }

  async confirmAssignment(id: string) {
    const assignment = await this.getAssignment(id);

    validateAssignmentTransition(
      assignment.status as AssignmentStatus,
      AssignmentStatus.CONFIRMED,
    );

    return this.db.assignment.update({
      where: { id },
      data: { status: AssignmentStatus.CONFIRMED },
    });
  }

  async cancelAssignment(id: string) {
    const assignment = await this.getAssignment(id);

    validateAssignmentTransition(
      assignment.status as AssignmentStatus,
      AssignmentStatus.CANCELLED,
    );

    return this.db.assignment.update({
      where: { id },
      data: { status: AssignmentStatus.CANCELLED },
    });
  }

  async completeAssignment(id: string) {
    const assignment = await this.getAssignment(id);

    validateAssignmentTransition(
      assignment.status as AssignmentStatus,
      AssignmentStatus.COMPLETED,
    );

    return this.db.assignment.update({
      where: { id },
      data: { status: AssignmentStatus.COMPLETED },
    });
  }

  async listAssignments(query?: { status?: string; search?: string; limit?: number; page?: number }) {
    const where: any = {};

    if (query?.status && query.status !== 'ALL') {
      where.status = query.status as AssignmentStatus;
    }

    if (query?.search && query.search.trim().length > 0) {
      const q = query.search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { requirementId: { contains: q, mode: 'insensitive' } },
        { driver: { fullName: { contains: q, mode: 'insensitive' } } },
        { driver: { phone: { contains: q, mode: 'insensitive' } } },
        { vehicle: { registrationNumber: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const assignments = await this.db.assignment.findMany({
      where,
      include: {
        driver: true,
        vehicle: true,
        requirement: true,
      },
      orderBy: { createdAt: 'desc' },
      take: query?.limit ? Number(query.limit) : 50,
      skip: query?.page && query?.limit ? (Number(query.page) - 1) * Number(query.limit) : 0,
    });

    return assignments.map((asg) => ({
      id: asg.id,
      requirementId: asg.requirementId,
      driverId: asg.driverId,
      driverName: asg.driver?.fullName || 'Assigned Driver',
      driverPhone: asg.driver?.phone || '',
      vehiclePlate: asg.vehicle?.registrationNumber || asg.driver?.vehiclePlate || 'N/A',
      vehicleType: asg.vehicle?.vehicleType || asg.driver?.vehicleType || asg.requirement?.vehicleType || 'SEDAN',
      status: asg.status,
      assignedAt: asg.assignedAt ? asg.assignedAt.toISOString() : asg.createdAt.toISOString(),
      createdAt: asg.createdAt.toISOString(),
    }));
  }
}

