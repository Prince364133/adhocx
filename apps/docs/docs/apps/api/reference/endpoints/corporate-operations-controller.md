---
title: CorporateOperationsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateOperationsController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateOperationsController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-OPERATIONS`  
**Controller source:** `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:28`  
**Nest route prefix:** `corporate/ops`  
**Swagger tags:** `Corporate ETS - Command Centre Operations`  
**Route methods:** 4; **decorated path variants:** 4

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/corporate/ops/board`

**Handler:** `CorporateOperationsController.board` — `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:35`

**Purpose:** Live board: route counts + paged lists by status for an IST day, at-risk (unassigned, pickup-1 within CORPORATE_ESCALATION_LEAD_MIN) queue, stale-GPS list and live offer state

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Query(date)` `date: string` — `string`
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(officeId)` `officeId: string` — `string`
- `@Query(page)` `page: string` — `string`
- `@Query(pageSize)` `pageSize: string` — `string`

**Success response declaration:**
- status `200` — Command-centre board

**Controller → service:**
- Calls `CorporateOperationsService.getBoard` at `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:49`; implementation: `apps/api/src/domains/corporate/operations/corporate-operations.service.ts:111`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.groupBy`, `corporateRoute.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:35` — route decorator and handler.
- `apps/api/src/domains/corporate/operations/corporate-operations.service.ts:111` — directly invoked service method.

## GET `/corporate/ops/live-operations`

**Handler:** `CorporateOperationsController.liveOperations` — `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:58`

**Purpose:** Cross-company live operations summary, 14-day route trend, company rollups, routes and recent activity

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Query(routePage)` `routePage: string` — `string`
- `@Query(routePageSize)` `routePageSize: string` — `string`

**Success response declaration:**
- status `200` — Live operations dashboard data

**Controller → service:**
- Calls `CorporateOperationsService.getLiveOperations` at `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:68`; implementation: `apps/api/src/domains/corporate/operations/corporate-operations.service.ts:220`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.findMany`, `corporateRoute.groupBy`, `corporateEmployee.groupBy`, `corporateOffice.groupBy`, `corporateRoute.count`, `corporateRoute.findMany`, `auditLog.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:58` — route decorator and handler.
- `apps/api/src/domains/corporate/operations/corporate-operations.service.ts:220` — directly invoked service method.

## GET `/corporate/ops/routes/:id/detail`

**Handler:** `CorporateOperationsController.detail` — `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:74`

**Purpose:** Full route with stops, live GPS position (with freshness) and offer state

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateOperationsService.getRouteDetail` at `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:79`; implementation: `apps/api/src/domains/corporate/operations/corporate-operations.service.ts:367`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:74` — route decorator and handler.
- `apps/api/src/domains/corporate/operations/corporate-operations.service.ts:367` — directly invoked service method.

## POST `/corporate/ops/routes/:id/reassign`

**Handler:** `CorporateOperationsController.reassign` — `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:82`

**Purpose:** Reassign an ASSIGNED route: removes the driver, withdraws offers, sets DISPATCHING and re-dispatches automatically or offers to newDriverId. Audited; notifies old driver, employees and new driver.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Body` `dto: ReassignRouteDto` — [`ReassignRouteDto`](../request-response-dto-catalog.md#reassign-route-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Route reassigned and back in dispatch
- status `409` — Route not ASSIGNED, changed concurrently, or driver unavailable

**Controller → service:**
- Calls `CorporateOperationsService.reassignRoute` at `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:93`; implementation: `apps/api/src/domains/corporate/operations/corporate-operations.service.ts:442`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`, `corporateDriverEarning.findMany`, `corporateRoute.updateMany`, `corporateDriverEarning.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ReassignRouteDto`](../request-response-dto-catalog.md#reassign-route-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:82` — route decorator and handler.
- `apps/api/src/domains/corporate/operations/corporate-operations.service.ts:442` — directly invoked service method.
