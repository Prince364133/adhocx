---
title: CorporateSupportTicketController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateSupportTicketController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateSupportTicketController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-SUPPORT-TICKET`  
**Controller source:** `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:61`  
**Nest route prefix:** `corporate/support/tickets`  
**Swagger tags:** `Corporate ETS - Support Tickets`  
**Route methods:** 15; **decorated path variants:** 15

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/corporate/support/tickets`

**Handler:** `CorporateSupportTicketController.createTicket` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:120`

**Purpose:** Create a tenant-scoped support ticket with optional images

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Body` `dto: CreateCorporateSupportTicketDto` — [`CreateCorporateSupportTicketDto`](../request-response-dto-catalog.md#create-corporate-support-ticket-dto)
- `@Req` `req: any`
- `@UploadedFiles` `files: Express.Multer.File[]`
- `@Headers(idempotency-key)` `idempotencyKey: string`

**Success response declaration:**
- status `201` — Ticket created with priority-based SLA

**Controller → service:**
- Calls `CorporateSupportTicketService.findIdempotentTicket` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:134`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:240`.
- Calls `CorporateSupportTicketService.createForEmployee` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:138`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:206`.
- Calls `StorageService.deleteStoredFile` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:149`; implementation: `apps/api/src/common/storage/storage.service.ts:443`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `corporateEmployee.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateCorporateSupportTicketDto`](../request-response-dto-catalog.md#create-corporate-support-ticket-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ConflictException`, `ForbiddenException`, `Error`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:120` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:240` — directly invoked service method.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:206` — directly invoked service method.
- `apps/api/src/common/storage/storage.service.ts:443` — directly invoked service method.

## GET `/corporate/support/tickets`

**Handler:** `CorporateSupportTicketController.listTickets` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:161`

**Purpose:** List authorized corporate tickets; platform Admin may filter across tenants

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Req` `req: any`
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(status)` `status: CorporateTicketStatus` — `CorporateTicketStatus`
- `@Query(priority)` `priority: CorporateTicketPriority` — `CorporateTicketPriority`
- `@Query(category)` `category: CorporateTicketCategory` — `CorporateTicketCategory`
- `@Query(employeeId)` `employeeId: string` — `string`
- `@Query(search)` `search: string` — `string`
- `@Query(from)` `from: string` — `string`
- `@Query(to)` `to: string` — `string`
- `@Query(limit)` `limit: string` — `string`
- `@Query(offset)` `offset: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.getEmployeeIdForUser` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:183`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:407`.
- Calls `CorporateSupportTicketService.listTickets` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:185`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:267`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateEmployee.findUnique`, `corporateSupportTicket.findMany`, `user.findMany`, `corporateRoute.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `CorporateTicketStatus`, `CorporateTicketPriority`, `CorporateTicketCategory`, `string`, `string`, `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:161` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:407` — directly invoked service method.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:267` — directly invoked service method.

## GET `/corporate/support/tickets/summary`

**Handler:** `CorporateSupportTicketController.summary` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:199`

**Purpose:** No @ApiOperation summary is declared; handler name is summary.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Req` `req: any`
- `@Query(tenantId)` `tenantId: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.ticketSummary` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:204`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:364`.
- Calls `CorporateSupportTicketService.getEmployeeIdForUser` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:207`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:407`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.count`, `corporateEmployee.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:199` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:364` — directly invoked service method.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:407` — directly invoked service method.

## GET `/corporate/support/tickets/:id`

**Handler:** `CorporateSupportTicketController.getTicket` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:212`

**Purpose:** Get authorized ticket details, replies, public timeline, and signed image URLs

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('ticket', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.getTicket` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:217`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:433`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `user.findUnique`, `corporateRoute.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:212` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:433` — directly invoked service method.

## POST `/corporate/support/tickets/:id/replies`

**Handler:** `CorporateSupportTicketController.reply` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:220`

**Purpose:** No @ApiOperation summary is declared; handler name is reply.

**Actor/access declaration:** Declared roles: `UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('ticket', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body(message)` `message: string` — `string`
- `@UploadedFiles` `files: Express.Multer.File[]`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.addComment` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:233`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:503`.
- Calls `StorageService.deleteStoredFile` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:237`; implementation: `apps/api/src/common/storage/storage.service.ts:443`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `corporateSupportTicketComment.create`, `corporateSupportTicketActivity.create`, `corporateSupportTicketAttachment.createMany`, `corporateSupportTicket.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ForbiddenException`, `NotFoundException`, `Error`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:220` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:503` — directly invoked service method.
- `apps/api/src/common/storage/storage.service.ts:443` — directly invoked service method.

## POST `/corporate/support/tickets/:id/reopen`

**Handler:** `CorporateSupportTicketController.reopen` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:251`

**Purpose:** Reopen a resolved or closed ticket (with a reason), or a resolved one via the legacy reasonless call

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('ticket', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Req` `req: any`
- `@Body` `dto: ReopenCorporateTicketDto` — [`ReopenCorporateTicketDto`](../request-response-dto-catalog.md#reopen-corporate-ticket-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.reopenTicket` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:259`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:991`.
- Calls `CorporateSupportTicketService.updateTicketStatus` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:262`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:686`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `corporateSupportTicket.update`, `corporateSupportTicket.updateMany`, `corporateSupportTicketActivity.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ReopenCorporateTicketDto`](../request-response-dto-catalog.md#reopen-corporate-ticket-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:251` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:991` — directly invoked service method.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:686` — directly invoked service method.

## PATCH `/corporate/support/tickets/:id/status`

**Handler:** `CorporateSupportTicketController.updateStatus` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:265`

**Purpose:** Change ticket status within the shared workflow

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('ticket', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `dto: UpdateSupportTicketStatusDto` — [`UpdateSupportTicketStatusDto`](../request-response-dto-catalog.md#update-support-ticket-status-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `409` — Illegal ticket transition

**Controller → service:**
- Calls `CorporateSupportTicketService.updateTicketStatus` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:272`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:686`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `corporateSupportTicket.update`, `corporateSupportTicket.updateMany`, `corporateSupportTicketActivity.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateSupportTicketStatusDto`](../request-response-dto-catalog.md#update-support-ticket-status-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ForbiddenException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:265` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:686` — directly invoked service method.

## PATCH `/corporate/support/tickets/:id/assignment`

**Handler:** `CorporateSupportTicketController.assign` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:275`

**Purpose:** No @ApiOperation summary is declared; handler name is assign.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('ticket', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `dto: { team?: string | null; userId?: string | null }` — `{ team?: string | null; userId?: string | null }`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.assignTicket` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:283`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:544`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `user.findUnique`, `corporateSupportTicket.update`, `corporateSupportTicketActivity.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ team?: string | null; userId?: string | null }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`, `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:275` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:544` — directly invoked service method.

## PATCH `/corporate/support/tickets/:id/assign`

**Handler:** `CorporateSupportTicketController.assignTicket` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:286`

**Purpose:** Assign or reassign a support ticket to an administrator or ops staff

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('ticket', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `dto: AssignCorporateTicketDto` — [`AssignCorporateTicketDto`](../request-response-dto-catalog.md#assign-corporate-ticket-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.assignTicket` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:300`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:544`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `user.findUnique`, `corporateSupportTicket.update`, `corporateSupportTicketActivity.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`AssignCorporateTicketDto`](../request-response-dto-catalog.md#assign-corporate-ticket-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`, `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:286` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:544` — directly invoked service method.

## PATCH `/corporate/support/tickets/:id/priority`

**Handler:** `CorporateSupportTicketController.updatePriority` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:303`

**Purpose:** No @ApiOperation summary is declared; handler name is updatePriority.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('ticket', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body(priority)` `priority: CorporateTicketPriority` — `CorporateTicketPriority`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.changePriority` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:307`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:659`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `corporateSupportTicket.update`, `corporateSupportTicketActivity.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `CorporateTicketPriority`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:303` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:659` — directly invoked service method.

## POST `/corporate/support/tickets/:id/comments`

**Handler:** `CorporateSupportTicketController.adminReply` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:310`

**Purpose:** No @ApiOperation summary is declared; handler name is adminReply.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('ticket', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body(message)` `message: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.addComment` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:314`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:503`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `corporateSupportTicketComment.create`, `corporateSupportTicketActivity.create`, `corporateSupportTicketAttachment.createMany`, `corporateSupportTicket.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ForbiddenException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:310` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:503` — directly invoked service method.

## POST `/corporate/support/tickets/:id/notes`

**Handler:** `CorporateSupportTicketController.adminNote` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:317`

**Purpose:** No @ApiOperation summary is declared; handler name is adminNote.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('ticket', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body(message)` `message: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.addComment` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:321`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:503`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `corporateSupportTicketComment.create`, `corporateSupportTicketActivity.create`, `corporateSupportTicketAttachment.createMany`, `corporateSupportTicket.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ForbiddenException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:317` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:503` — directly invoked service method.

## GET `/corporate/support/tickets/:id/messages`

**Handler:** `CorporateSupportTicketController.listMessages` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:324`

**Purpose:** List conversation messages for a support ticket

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('ticket', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.listMessages` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:329`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:815`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `corporateTicketMessage.findMany`, `corporateSupportTicketComment.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:324` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:815` — directly invoked service method.

## POST `/corporate/support/tickets/:id/messages`

**Handler:** `CorporateSupportTicketController.createMessage` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:332`

**Purpose:** Post a reply or internal note on a support ticket

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('ticket', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `dto: CreateCorporateTicketMessageDto` — [`CreateCorporateTicketMessageDto`](../request-response-dto-catalog.md#create-corporate-ticket-message-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.createMessage` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:347`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:882`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `user.findUnique`, `corporateEmployee.findUnique`, `user.findFirst`, `corporateTicketMessage.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateCorporateTicketMessageDto`](../request-response-dto-catalog.md#create-corporate-ticket-message-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:332` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:882` — directly invoked service method.

## GET `/corporate/support/tickets/:id/activity`

**Handler:** `CorporateSupportTicketController.getActivity` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:350`

**Purpose:** Get ticket audit and activity history

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('ticket', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.getActivity` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:355`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:1063`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `auditLog.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:350` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:1063` — directly invoked service method.
