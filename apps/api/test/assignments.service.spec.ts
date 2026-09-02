import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { AssignmentsService } from '../src/modules/assignments/assignments.service';
import { DatabaseService } from '../src/database/database.service';
import {
  AssignmentStatus,
  InvalidStateTransitionError,
} from '@adhocx/contracts';


describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let mockDb: { assignment: { findUnique: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    mockDb = {
      assignment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw NotFoundException when assignment does not exist', async () => {
    mockDb.assignment.findUnique.mockResolvedValue(null);

    await expect(service.getAssignment('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should confirm a pending assignment', async () => {
    const assignment = { id: 'asg-1', status: AssignmentStatus.PENDING };
    mockDb.assignment.findUnique.mockResolvedValue(assignment);
    mockDb.assignment.update.mockResolvedValue({
      ...assignment,
      status: AssignmentStatus.CONFIRMED,
    });

    const result = await service.confirmAssignment('asg-1');
    expect(result.status).toBe(AssignmentStatus.CONFIRMED);
    expect(mockDb.assignment.update).toHaveBeenCalledWith({
      where: { id: 'asg-1' },
      data: { status: AssignmentStatus.CONFIRMED },
    });
  });

  it('should throw error when confirming an already completed assignment', async () => {
    const assignment = { id: 'asg-1', status: AssignmentStatus.COMPLETED };
    mockDb.assignment.findUnique.mockResolvedValue(assignment);

    await expect(service.confirmAssignment('asg-1')).rejects.toThrow(
      InvalidStateTransitionError,
    );

  });

  it('should cancel an active assignment', async () => {
    const assignment = { id: 'asg-1', status: AssignmentStatus.CONFIRMED };
    mockDb.assignment.findUnique.mockResolvedValue(assignment);
    mockDb.assignment.update.mockResolvedValue({
      ...assignment,
      status: AssignmentStatus.CANCELLED,
    });

    const result = await service.cancelAssignment('asg-1');
    expect(result.status).toBe(AssignmentStatus.CANCELLED);
  });

  it('should complete an assignment', async () => {
    const assignment = { id: 'asg-1', status: AssignmentStatus.CONFIRMED };
    mockDb.assignment.findUnique.mockResolvedValue(assignment);
    mockDb.assignment.update.mockResolvedValue({
      ...assignment,
      status: AssignmentStatus.COMPLETED,
    });

    const result = await service.completeAssignment('asg-1');
    expect(result.status).toBe(AssignmentStatus.COMPLETED);
  });
});
