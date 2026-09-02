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
}
