---
title: OpsSupportTicketController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for OpsSupportTicketController.
status: partial
last_reviewed: "2026-11-23"
---

# OpsSupportTicketController Endpoint Reference

**Stable controller ID:** `API-CTRL-OPS-SUPPORT-TICKET`  
**Controller source:** `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:359`  
**Nest route prefix:** `ops/support/tickets`  
**Swagger tags:** `OPS - Support Tickets`  
**Route methods:** 4; **decorated path variants:** 4

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/ops/support/tickets`

**Handler:** `OpsSupportTicketController.list` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:368`

**Purpose:** No @ApiOperation summary is declared; handler name is list.

**Actor/access declaration:** Declared roles: `UserRole.OPS, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.listOpsTickets` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:371`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:672`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:368` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:672` — directly invoked service method.

## GET `/ops/support/tickets/:id`

**Handler:** `OpsSupportTicketController.detail` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:374`

**Purpose:** No @ApiOperation summary is declared; handler name is detail.

**Actor/access declaration:** Declared roles: `UserRole.OPS, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.getOpsTicket` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:377`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:428`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:374` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:428` — directly invoked service method.

## POST `/ops/support/tickets/:id/updates`

**Handler:** `OpsSupportTicketController.update` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:380`

**Purpose:** No @ApiOperation summary is declared; handler name is update.

**Actor/access declaration:** Declared roles: `UserRole.OPS, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body(message)` `message: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.assertOpsTicket` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:383`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:416`.
- Calls `CorporateSupportTicketService.addComment` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:384`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:503`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `corporateSupportTicketComment.create`, `corporateSupportTicketActivity.create`, `corporateSupportTicketAttachment.createMany`, `corporateSupportTicket.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:380` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:416` — directly invoked service method.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:503` — directly invoked service method.

## PATCH `/ops/support/tickets/:id/status`

**Handler:** `OpsSupportTicketController.status` — `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:387`

**Purpose:** No @ApiOperation summary is declared; handler name is status.

**Actor/access declaration:** Declared roles: `UserRole.OPS, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `dto: UpdateSupportTicketStatusDto` — [`UpdateSupportTicketStatusDto`](../request-response-dto-catalog.md#update-support-ticket-status-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSupportTicketService.assertOpsTicket` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:391`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:416`.
- Calls `CorporateSupportTicketService.updateTicketStatus` at `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:392`; implementation: `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:686`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `corporateSupportTicket.update`, `corporateSupportTicket.updateMany`, `corporateSupportTicketActivity.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateSupportTicketStatusDto`](../request-response-dto-catalog.md#update-support-ticket-status-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`, `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts:387` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:416` — directly invoked service method.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.service.ts:686` — directly invoked service method.
