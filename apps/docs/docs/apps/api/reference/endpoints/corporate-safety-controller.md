---
title: CorporateSafetyController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateSafetyController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateSafetyController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-SAFETY`  
**Controller source:** `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:47`  
**Nest route prefix:** `corporate/safety`  
**Swagger tags:** `Corporate ETS - Safety SOS & Command Centre`  
**Route methods:** 13; **decorated path variants:** 13

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/corporate/safety/sos`

**Handler:** `CorporateSafetyController.triggerSos` — `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:54`

**Purpose:** P0 Emergency SOS Trigger. Dispatches instant alerts to Super Admin Command Centre & Corporate Safety Desk

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'routeId', { from: 'body' })`.

**Request inputs:**
- `@Body` `dto: TriggerSosAlertDto` — [`TriggerSosAlertDto`](../request-response-dto-catalog.md#trigger-sos-alert-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `201` — Emergency SOS activated

**Controller → service:**
- Calls `CorporateSafetyService.triggerSosAlert` at `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:69`; implementation: `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:46`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`, `corporateSosAlert.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`TriggerSosAlertDto`](../request-response-dto-catalog.md#trigger-sos-alert-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:54` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:46` — directly invoked service method.

## GET `/corporate/safety/alerts`

**Handler:** `CorporateSafetyController.listAlerts` — `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:72`

**Purpose:** List active and historical corporate SOS emergency alerts for Command Centre

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Query(status)` `status: CorporateSosStatus` — `CorporateSosStatus`
- `@Query(routeId)` `routeId: string` — `string`
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(activeOnly)` `activeOnly: string` — `string`
- `@Query(limit)` `limit: string` — `string`

**Success response declaration:**
- status `200` — List of emergency alerts

**Controller → service:**
- Calls `CorporateSafetyService.listSosAlerts` at `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:84`; implementation: `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:129`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSosAlert.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `CorporateSosStatus`, `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:72` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:129` — directly invoked service method.

## POST `/corporate/safety/alerts/:id/acknowledge`

**Handler:** `CorporateSafetyController.acknowledgeAlert` — `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:93`

**Purpose:** SOS stage 2: commander acknowledges a NEW / ACTIVE (or unacknowledged ESCALATED) alert

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('sos', 'id')`.

**Request inputs:**
- `@Param(id)` `alertId: string`
- `@Body` `dto: SosLifecycleNotesDto` — [`SosLifecycleNotesDto`](../request-response-dto-catalog.md#sos-lifecycle-notes-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Alert acknowledged
- status `409` — Illegal transition (already acknowledged or closed)

**Controller → service:**
- Calls `CorporateSafetyService.acknowledgeSosAlert` at `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:108`; implementation: `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:174`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`SosLifecycleNotesDto`](../request-response-dto-catalog.md#sos-lifecycle-notes-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:93` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:174` — directly invoked service method.

## POST `/corporate/safety/alerts/:id/investigate`

**Handler:** `CorporateSafetyController.investigateAlert` — `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:111`

**Purpose:** SOS stage 3: mark an acknowledged / escalated alert under active investigation

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('sos', 'id')`.

**Request inputs:**
- `@Param(id)` `alertId: string`
- `@Body` `dto: SosLifecycleNotesDto` — [`SosLifecycleNotesDto`](../request-response-dto-catalog.md#sos-lifecycle-notes-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Alert under investigation
- status `409` — Illegal transition (not acknowledged yet, or closed)

**Controller → service:**
- Calls `CorporateSafetyService.investigateSosAlert` at `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:121`; implementation: `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:222`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`SosLifecycleNotesDto`](../request-response-dto-catalog.md#sos-lifecycle-notes-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:111` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:222` — directly invoked service method.

## POST `/corporate/safety/alerts/:id/escalate`

**Handler:** `CorporateSafetyController.escalateAlert` — `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:124`

**Purpose:** SOS stage 4: escalate to police / field response (raises the escalation level)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('sos', 'id')`.

**Request inputs:**
- `@Param(id)` `alertId: string`
- `@Body` `dto: SosLifecycleNotesDto` — [`SosLifecycleNotesDto`](../request-response-dto-catalog.md#sos-lifecycle-notes-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Alert escalated
- status `409` — Illegal transition (already escalated or closed)

**Controller → service:**
- Calls `CorporateSafetyService.escalateSosAlert` at `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:133`; implementation: `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:260`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`SosLifecycleNotesDto`](../request-response-dto-catalog.md#sos-lifecycle-notes-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:124` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:260` — directly invoked service method.

## POST `/corporate/safety/alerts/:id/close`

**Handler:** `CorporateSafetyController.closeAlert` — `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:136`

**Purpose:** SOS stage 5: close an open alert as RESOLVED (default) or FALSE_ALARM with incident notes

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('sos', 'id')`.

**Request inputs:**
- `@Param(id)` `alertId: string`
- `@Body` `dto: SosLifecycleNotesDto` — [`SosLifecycleNotesDto`](../request-response-dto-catalog.md#sos-lifecycle-notes-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Alert closed
- status `409` — Alert already closed

**Controller → service:**
- Calls `CorporateSafetyService.closeSosAlert` at `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:159`; implementation: `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:301`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`SosLifecycleNotesDto`](../request-response-dto-catalog.md#sos-lifecycle-notes-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:136` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:301` — directly invoked service method.

## POST `/corporate/safety/alerts/:id/resolve`

**Handler:** `CorporateSafetyController.resolveAlert` — `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:162`

**Purpose:** Alias of POST /alerts/:id/close: resolve an open alert with incident resolution notes

**Alias note:** Swagger summary explicitly identifies this operation as an alias; compare related handlers in this controller.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('sos', 'id')`.

**Request inputs:**
- `@Param(id)` `alertId: string`
- `@Body` `dto: ResolveSosAlertDto` — [`ResolveSosAlertDto`](../request-response-dto-catalog.md#resolve-sos-alert-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Alert resolved

**Controller → service:**
- Calls `CorporateSafetyService.resolveSosAlert` at `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:177`; implementation: `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:312`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`ResolveSosAlertDto`](../request-response-dto-catalog.md#resolve-sos-alert-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:162` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:312` — directly invoked service method.

## POST `/corporate/safety/routes/:id/check-deviation`

**Handler:** `CorporateSafetyController.checkDeviation` — `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:180`

**Purpose:** Check vehicle position against planned route corridor and trigger deviation alarm if >500m

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Body` `body: { latitude: number; longitude: number }` — `{ latitude: number; longitude: number }`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSafetyService.checkRouteDeviation` at `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:191`; implementation: `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:480`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ latitude: number; longitude: number }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:180` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:480` — directly invoked service method.

## POST `/corporate/safety/routes/:id/stops/:stopId/confirm-safe-drop`

**Handler:** `CorporateSafetyController.confirmSafeDrop` — `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:194`

**Purpose:** Confirm safe drop for female commuter on late-night shift logout (>20:00)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('stop', 'stopId')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Param(stopId)` `stopId: string`
- `@Body` `dto: ConfirmSafeDropDto` — [`ConfirmSafeDropDto`](../request-response-dto-catalog.md#confirm-safe-drop-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSafetyService.confirmSafeDrop` at `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:204`; implementation: `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:543`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findUnique`, `corporateRouteStop.update`, `corporateTransportRequest.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ConfirmSafeDropDto`](../request-response-dto-catalog.md#confirm-safe-drop-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:194` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:543` — directly invoked service method.

## POST `/corporate/safety/routes/:id/stops/:stopId/confirm-safe-reach`

**Handler:** `CorporateSafetyController.confirmSafeReach` — `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:207`

**Purpose:** Employee confirms safe reach into residence / destination. Immutable evidence recorded in safety ledger

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('stop', 'stopId')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Param(stopId)` `stopId: string`
- `@Body` `dto: ConfirmSafeReachDto` — [`ConfirmSafeReachDto`](../request-response-dto-catalog.md#confirm-safe-reach-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSafetyService.confirmSafeReach` at `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:220`; implementation: `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:736`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findUnique`, `corporateRouteStop.update`, `corporateTransportRequest.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ConfirmSafeReachDto`](../request-response-dto-catalog.md#confirm-safe-reach-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:207` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:736` — directly invoked service method.

## POST `/corporate/safety/routes/:id/stops/:stopId/emergency-boarding-override`

**Handler:** `CorporateSafetyController.emergencyBoardingOverride` — `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:233`

**Purpose:** Command Centre emergency boarding manual override with audit ticket generation when OTP verification is unavailable

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('stop', 'stopId')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Param(stopId)` `stopId: string`
- `@Body` `dto: EmergencyBoardingFallbackDto` — [`EmergencyBoardingFallbackDto`](../request-response-dto-catalog.md#emergency-boarding-fallback-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSafetyService.emergencyBoardingOverride` at `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:249`; implementation: `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:835`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findUnique`, `corporateRouteStop.update`, `corporateTransportRequest.update`, `corporateSupportTicket.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`EmergencyBoardingFallbackDto`](../request-response-dto-catalog.md#emergency-boarding-fallback-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:233` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:835` — directly invoked service method.

## GET `/corporate/safety/tracking-loss`

**Handler:** `CorporateSafetyController.getTrackingLossRoutes` — `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:252`

**Purpose:** Detect active routes in IN_TRANSIT with missing/stale telemetry (>180s)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSafetyService.detectTelemetryLoss` at `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:257`; implementation: `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:1030`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findMany`, `corporateRoute.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:252` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:1030` — directly invoked service method.

## GET `/corporate/safety/stops/:stopId/safe-drop-status`

**Handler:** `CorporateSafetyController.getSafeDropStatus` — `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:260`

**Purpose:** Retrieve live safe-drop and escort status of a stop

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('stop', 'stopId')`.

**Request inputs:**
- `@Param(stopId)` `stopId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateSafetyService.getSafeDropStatus` at `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:265`; implementation: `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:1209`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/safety/corporate-safety.controller.ts:260` — route decorator and handler.
- `apps/api/src/domains/corporate/safety/corporate-safety.service.ts:1209` — directly invoked service method.
