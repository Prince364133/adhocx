---
title: CorporateDispatchController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateDispatchController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateDispatchController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-DISPATCH`  
**Controller source:** `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:23`  
**Nest route prefix:** `corporate/dispatch`  
**Swagger tags:** `Corporate ETS - Autonomous Dispatch & DDA`  
**Route methods:** 8; **decorated path variants:** 8

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/corporate/dispatch/routes/:id/start-now`

**Handler:** `CorporateDispatchController.forceStartDispatch` — `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:34`

**Purpose:** Manual Super Admin dispatch override: Immediately initiates H3 driver dispatch ("Start" button)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Body(actorUserId)` `actorUserId: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateDispatchService.dispatchRoute` at `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:46`; implementation: `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:770`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`, `corporateRoute.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:34` — route decorator and handler.
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:770` — directly invoked service method.

## POST `/corporate/dispatch/routes/:id/offers/accept`

**Handler:** `CorporateDispatchController.acceptOffer` — `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:49`

**Purpose:** Driver accepts atomic corporate route offer within 60 seconds

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id', { driverMode: 'offer' })`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Body(driverId)` `driverId: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateDispatchService.acceptRouteOffer` at `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:69`; implementation: `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:1371`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateDriverOffer.findFirst`, `driver.findUnique`, `vehicle.findFirst`, `corporateRoute.update`, `corporateDriverEarning.create`, `corporateDriverOffer.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ConflictException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:49` — route decorator and handler.
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:1371` — directly invoked service method.

## POST `/corporate/dispatch/routes/:id/offers/reject`

**Handler:** `CorporateDispatchController.rejectOffer` — `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:72`

**Purpose:** Driver declines corporate route offer or offer expires; cascades to next candidate

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id', { driverMode: 'offer' })`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Body(driverId)` `driverId: string` — `string`
- `@Body(reason)` `reason: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateDispatchService.rejectRouteOffer` at `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:94`; implementation: `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:1549`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateDriverOffer.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:72` — route decorator and handler.
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:1549` — directly invoked service method.

## GET `/corporate/dispatch/routes/:id/traffic-assessment`

**Handler:** `CorporateDispatchController.getTrafficAssessment` — `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:98`

**Purpose:** Evaluate Dynamic Traffic Advancer (DDA) delay and advance dispatch if congested

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateDispatchService.assessDynamicTraffic` at `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:103`; implementation: `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:327`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:98` — route decorator and handler.
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:327` — directly invoked service method.

## GET `/corporate/dispatch/routes/:id/status`

**Handler:** `CorporateDispatchController.getDispatchStatus` — `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:106`

**Purpose:** Get current real-time dispatch offer state for a corporate route

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `RedisService.getClient` at `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:111`; implementation: `apps/api/src/redis/redis.service.ts:96`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:106` — route decorator and handler.
- `apps/api/src/redis/redis.service.ts:96` — directly invoked service method.

## GET `/corporate/dispatch/my-offer`

**Handler:** `CorporateDispatchController.getMyActiveOffer` — `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:123`

**Purpose:** Check if driver has a live 60-second corporate route offer (UI-04-01)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- Handler return annotation: `Promise<{     hasOffer: boolean;     routeId?: string;     remainingTtlSeconds?: number;     /** Live offer payload as stored by dispatch (plus 'id' / 'remainingSeconds'). */     offer?: any;   }>`; the runtime response shape is not separately declared in Swagger.

**Controller → service:**
- Calls `CorporateDispatchService.getDriverActiveOffer` at `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:138`; implementation: `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:1767`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateDriverOffer.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:123` — route decorator and handler.
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:1767` — directly invoked service method.

## GET `/corporate/dispatch/driver-offers`

**Handler:** `CorporateDispatchController.getDriverOffers` — `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:147`

**Purpose:** Retrieve currently active corporate route offer for authenticated driver (UI Reconnect)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateDispatchService.getDriverActiveOffer` at `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:154`; implementation: `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:1767`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateDriverOffer.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:147` — route decorator and handler.
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:1767` — directly invoked service method.

## GET `/corporate/dispatch/driver-duties`

**Handler:** `CorporateDispatchController.getDriverDuties` — `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:157`

**Purpose:** Retrieve upcoming assigned corporate routes and duties for authenticated driver

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateDispatchService.getDriverAssignedDuties` at `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:164`; implementation: `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:1841`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.controller.ts:157` — route decorator and handler.
- `apps/api/src/domains/corporate/dispatch/corporate-dispatch.service.ts:1841` — directly invoked service method.
