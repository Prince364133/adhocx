import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { AdminAssignmentQueryDto, AdminAssignmentListItemDto, UserRole } from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles } from '../../common';
import { AssignmentsService } from './assignments.service';

@ApiTags('Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiOperation({ summary: 'List driver requirement assignments' })
  @SwaggerResponse({ status: 200, type: [AdminAssignmentListItemDto] })
  async listAssignments(@Query() query: AdminAssignmentQueryDto) {
    return this.assignmentsService.listAssignments(query);
  }
}
