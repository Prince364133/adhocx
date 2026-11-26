---
title: CorporateTrackingController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateTrackingController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateTrackingController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-TRACKING`  
**Controller source:** `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:39`  
**Nest route prefix:** `corporate/trips`  
**Swagger tags:** `Corporate ETS - Tracking, Timeline & Playback`  
**Route methods:** 5; **decorated path variants:** 5

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/corporate/trips/routes/:id/tracking`

**Handler:** `CorporateTrackingController.getTracking` — `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:55`

**Purpose:** Latest vehicle position with GPS freshness: gpsState LIVE (<=45s) / STALE (<=180s) / OFFLINE and lastFixAgeSec

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.DRIVER, UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTrackingService.getTracking` at `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:63`; implementation: `apps/api/src/domains/corporate/tracking/corporate-tracking.service.ts:186`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateVehiclePosition.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:55` — route decorator and handler.
- `apps/api/src/domains/corporate/tracking/corporate-tracking.service.ts:186` — directly invoked service method.

## GET `/corporate/trips/routes/:id/timeline`

**Handler:** `CorporateTrackingController.getTimeline` — `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:66`

**Purpose:** Ordered trip events (start, arrive, board, no-show, offers, replans) and assignment history

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTrackingService.getTimeline` at `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:71`; implementation: `apps/api/src/domains/corporate/tracking/corporate-tracking.service.ts:231`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTripEvent.findMany`, `corporateRouteAssignmentEvent.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:66` — route decorator and handler.
- `apps/api/src/domains/corporate/tracking/corporate-tracking.service.ts:231` — directly invoked service method.

## GET `/corporate/trips/routes/:id/playback`

**Handler:** `CorporateTrackingController.getPlayback` — `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:74`

**Purpose:** GPS history ordered by device time; window <= 24h, paged by cursor (limit <= 5000)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Query(from)` `from: string` — `string`
- `@Query(to)` `to: string` — `string`
- `@Query(limit)` `limit: string` — `string`
- `@Query(cursor)` `cursor: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTrackingService.getPlayback` at `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:90`; implementation: `apps/api/src/domains/corporate/tracking/corporate-tracking.service.ts:285`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateVehiclePosition.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:74` — route decorator and handler.
- `apps/api/src/domains/corporate/tracking/corporate-tracking.service.ts:285` — directly invoked service method.

## GET `/corporate/trips/routes/fleet/live`

**Handler:** `CorporateTrackingController.getFleetSnapshot` — `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:93`

**Purpose:** Latest known position of every active cab in scope (hydrates the live map)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Req` `req: any`
- `@Query(tenantId)` `tenantId: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTrackingService.getFleetSnapshot` at `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:103`; implementation: `apps/api/src/domains/corporate/tracking/corporate-tracking.service.ts:89`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:93` — route decorator and handler.
- `apps/api/src/domains/corporate/tracking/corporate-tracking.service.ts:89` — directly invoked service method.

## POST `/corporate/trips/live-stream-tickets`

**Handler:** `CorporateTrackingController.issueStreamTicket` — `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:106`

**Purpose:** Single-use ticket (valid 30 s) for opening a live-stream EventSource: GET .../live-stream?ticket=… . Keeps the access token out of URLs and logs

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.DRIVER, UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- Handler return annotation: `Promise<{ ticket: string; expiresAt: string }>`; the runtime response shape is not separately declared in Swagger.

**Controller → service:**
- Calls `StreamTicketService.issue` at `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:117`; implementation: `apps/api/src/redis/stream-ticket.service.ts:28`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `ServiceUnavailableException`, `UnauthorizedException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts:106` — route decorator and handler.
- `apps/api/src/redis/stream-ticket.service.ts:28` — directly invoked service method.
