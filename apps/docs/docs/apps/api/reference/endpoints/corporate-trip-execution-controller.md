---
title: CorporateTripExecutionController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateTripExecutionController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateTripExecutionController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-TRIP-EXECUTION`  
**Controller source:** `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:39`  
**Nest route prefix:** `corporate/trips`  
**Swagger tags:** `Corporate ETS - Trip Execution & OTP Boarding`  
**Route methods:** 22; **decorated path variants:** 22

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/corporate/trips/routes/:id/start`

**Handler:** `CorporateTripExecutionController.startRoute` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:50`

**Purpose:** Driver starts driving toward pickup 1 (ASSIGNED -> IN_TRANSIT). Notifies every employee with individual ETA

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Body` `body: StartRouteDto` — [`StartRouteDto`](../request-response-dto-catalog.md#start-route-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.startRoute` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:68`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:86`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`, `corporateRoute.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`StartRouteDto`](../request-response-dto-catalog.md#start-route-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:50` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:86` — directly invoked service method.

## POST `/corporate/trips/routes/:id/stops/:stopId/arrive`

**Handler:** `CorporateTripExecutionController.arriveAtStop` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:71`

**Purpose:** Driver marks arrival at pickup stop. Geofence verified (<150m), triggers immutable 5-minute dwell timer

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('stop', 'stopId')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Param(stopId)` `stopId: string`
- `@Body` `body: ArriveAtStopDto` — [`ArriveAtStopDto`](../request-response-dto-catalog.md#arrive-at-stop-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.arriveAtStop` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:96`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:201`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`, `corporateRouteStop.update`, `corporateRoute.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ArriveAtStopDto`](../request-response-dto-catalog.md#arrive-at-stop-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:71` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:201` — directly invoked service method.

## POST `/corporate/trips/routes/:id/stops/:stopId/verify-otp`

**Handler:** `CorporateTripExecutionController.verifyOtp` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:99`

**Purpose:** Driver validates 4-digit numeric boarding OTP presented by employee. Transitions stop to BOARDED

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('stop', 'stopId')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Param(stopId)` `stopId: string`
- `@Body` `body: VerifyStopOtpDto` — [`VerifyStopOtpDto`](../request-response-dto-catalog.md#verify-stop-otp-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.verifyBoardingOtp` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:123`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:381`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findUnique`, `corporateRouteStop.update`, `corporateTransportRequest.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VerifyStopOtpDto`](../request-response-dto-catalog.md#verify-stop-otp-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `HttpException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:99` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:381` — directly invoked service method.

## POST `/corporate/trips/routes/:id/stops/:stopId/no-show`

**Handler:** `CorporateTripExecutionController.markNoShow` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:126`

**Purpose:** Driver marks employee as No-Show after 5-minute wait window has elapsed. Departs immediately to next stop

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('stop', 'stopId')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Param(stopId)` `stopId: string`
- `@Body` `body: MarkNoShowDto` — [`MarkNoShowDto`](../request-response-dto-catalog.md#mark-no-show-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.markNoShow` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:146`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:518`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findUnique`, `corporateRouteStop.update`, `corporateTransportRequest.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`MarkNoShowDto`](../request-response-dto-catalog.md#mark-no-show-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:126` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:518` — directly invoked service method.

## POST `/corporate/trips/routes/:id/stops/:stopId/otp-unlock`

**Handler:** `CorporateTripExecutionController.unlockBoardingOtp` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:149`

**Purpose:** Ops: unlock a stop whose boarding OTP locked after 5 wrong attempts. The employee\'s correct code is still required afterwards. Audited.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('stop', 'stopId')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Param(stopId)` `stopId: string`
- `@Body` `body: { reason?: string }` — `{ reason?: string }`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.unlockBoardingOtp` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:167`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:325`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ reason?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:149` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:325` — directly invoked service method.

## POST `/corporate/trips/routes/:id/complete`

**Handler:** `CorporateTripExecutionController.completeRoute` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:170`

**Purpose:** Complete corporate route upon reaching office destination hub

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.completeRoute` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:175`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:646`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`, `corporateRoute.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:170` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:646` — directly invoked service method.

## POST `/corporate/trips/routes/:id/stops/:stopId/drop`

**Handler:** `CorporateTripExecutionController.dropPassenger` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:178`

**Purpose:** Driver records passenger dropped at destination. Geofence verified (<150m), initiates safe-arrival protocol

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('stop', 'stopId')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Param(stopId)` `stopId: string`
- `@Body` `body: { driverLatitude: number; driverLongitude: number }` — `{ driverLatitude: number; driverLongitude: number }`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.dropPassenger` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:204`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:1266`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findUnique`, `corporateRouteStop.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ driverLatitude: number; driverLongitude: number }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:178` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:1266` — directly invoked service method.

## POST `/corporate/trips/routes/:id/stops/:stopId/confirm-safe-reach`

**Handler:** `CorporateTripExecutionController.confirmSafeReach` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:212`

**Purpose:** Employee confirms safe arrival at residence / destination. Records immutable timestamp and closes safe check window

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('stop', 'stopId')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Param(stopId)` `stopId: string`
- `@Body` `body: { confirmedSafely?: boolean; notes?: string }` — `{ confirmedSafely?: boolean; notes?: string }`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.confirmSafeReach` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:235`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:1318`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ confirmedSafely?: boolean; notes?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:212` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:1318` — directly invoked service method.

## POST `/corporate/trips/routes/:id/stops/:stopId/emergency-boarding-override`

**Handler:** `CorporateTripExecutionController.emergencyBoardingOverride` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:247`

**Purpose:** Command Centre emergency boarding manual override when OTP fails. Prevents false driver confirmation; logs auditable incident ticket

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('stop', 'stopId')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Param(stopId)` `stopId: string`
- `@Body` `body: any` — `any`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.emergencyBoardingOverride` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:263`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:1349`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:247` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:1349` — directly invoked service method.

## GET `/corporate/trips/routes/:id/stops/:stopId/boarding-qr`

**Handler:** `CorporateTripExecutionController.getBoardingQr` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:278`

**Purpose:** Generate dynamic, time-limited QR boarding token for employee mobile app

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.EMPLOYEE`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('stop', 'stopId')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Param(stopId)` `stopId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.generateBoardingQrToken` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:286`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:833`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:278` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:833` — directly invoked service method.

## POST `/corporate/trips/routes/:id/stops/:stopId/verify-qr`

**Handler:** `CorporateTripExecutionController.verifyQr` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:289`

**Purpose:** Driver scans employee dynamic QR code to verify boarding and departure

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('stop', 'stopId')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Param(stopId)` `stopId: string`
- `@Body` `body: VerifyStopQrDto` — [`VerifyStopQrDto`](../request-response-dto-catalog.md#verify-stop-qr-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.verifyBoardingQr` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:301`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:880`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VerifyStopQrDto`](../request-response-dto-catalog.md#verify-stop-qr-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:289` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:880` — directly invoked service method.

## POST `/corporate/trips/routes/:id/telemetry`

**Handler:** `CorporateTripExecutionController.ingestTelemetry` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:304`

**Purpose:** Ingest live driver GPS telemetry and broadcast to Corporate Live Map

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Body` `body: RouteTelemetryDto` — [`RouteTelemetryDto`](../request-response-dto-catalog.md#route-telemetry-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.ingestRouteTelemetry` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:315`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:988`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`RouteTelemetryDto`](../request-response-dto-catalog.md#route-telemetry-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:304` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:988` — directly invoked service method.

## GET `/corporate/trips/routes/:id/waypoints`

**Handler:** `CorporateTripExecutionController.getWaypoints` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:318`

**Purpose:** Retrieve ordered waypoints and corridor polyline for driver turn-by-turn navigation

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.getRouteWaypoints` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:323`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:1080`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:318` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:1080` — directly invoked service method.

## POST `/corporate/trips/requests/:id/reschedule`

**Handler:** `CorporateTripExecutionController.rescheduleOrCancel` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:326`

**Purpose:** Employee reschedules shift or cancels transport request. Strictly enforces the 9-hour cutoff rule

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('request', 'id')`.

**Request inputs:**
- `@Param(id)` `requestId: string`
- `@Body` `body: RescheduleRequestDto` — [`RescheduleRequestDto`](../request-response-dto-catalog.md#reschedule-request-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.handleRescheduleOrCancel` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:355`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:716`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTransportRequest.findUnique`, `corporateTransportRequest.update`, `corporateRouteStop.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`RescheduleRequestDto`](../request-response-dto-catalog.md#reschedule-request-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:326` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:716` — directly invoked service method.

## POST `/corporate/trips/requests/:id/admin-reschedule`

**Handler:** `CorporateTripExecutionController.adminRescheduleOrCancel` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:363`

**Purpose:** Corporate admin cancels/reschedules on behalf of an employee, explicitly overriding the 9-hour cutoff (audited)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('request', 'id')`.

**Request inputs:**
- `@Param(id)` `requestId: string`
- `@Body` `body: AdminRescheduleRequestDto` — [`AdminRescheduleRequestDto`](../request-response-dto-catalog.md#admin-reschedule-request-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.handleRescheduleOrCancel` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:395`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:716`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTransportRequest.findUnique`, `corporateTransportRequest.update`, `corporateRouteStop.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`AdminRescheduleRequestDto`](../request-response-dto-catalog.md#admin-reschedule-request-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:363` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:716` — directly invoked service method.

## GET `/corporate/trips/requests`

**Handler:** `CorporateTripExecutionController.listRequests` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:407`

**Purpose:** List and filter corporate transport requests / booking queue across all rosters

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`, `CorporatePermission('bookings:read')`.

**Request inputs:**
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(status)` `status: string` — `string`
- `@Query(direction)` `direction: string` — `string`
- `@Query(scheduledDate)` `scheduledDate: string` — `string`
- `@Query(search)` `search: string` — `string`
- `@Query(page)` `page: string` — `string`
- `@Query(limit)` `limit: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:407` — route decorator and handler.

## POST `/corporate/trips/requests/:id/review`

**Handler:** `CorporateTripExecutionController.reviewRequest` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:496`

**Purpose:** Approve or reject an ad-hoc or exception transport booking request

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('request', 'id')`.

**Request inputs:**
- `@Param(id)` `requestId: string`
- `@Body` `body: { decision: 'APPROVE' | 'REJECT'; notes?: string }` — `{ decision: 'APPROVE' | 'REJECT'; notes?: string }`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `{ decision: 'APPROVE' | 'REJECT'; notes?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:496` — route decorator and handler.

## GET `/corporate/trips/me/schedule`

**Handler:** `CorporateTripExecutionController.getMySchedule` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:529`

**Purpose:** DEPRECATED: use GET /corporate/me/schedule. Shift schedule of the authenticated employee (EMP-03-01)

**Lifecycle:** Marked deprecated in the Swagger operation decorator.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.EMPLOYEE`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.getRiderSchedule` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:537`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:142`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTransportRequest.findMany`, `corporateRouteStop.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:529` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:142` — directly invoked service method.

## GET `/corporate/trips/me/next-trip`

**Handler:** `CorporateTripExecutionController.getMyNextTrip` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:540`

**Purpose:** DEPRECATED: use GET /corporate/me/trips/next. Next upcoming trip card with driver and OTP (EMP-02-01)

**Lifecycle:** Marked deprecated in the Swagger operation decorator.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.EMPLOYEE`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- Handler return annotation: `Promise<any>`; the runtime response shape is not separately declared in Swagger.

**Controller → service:**
- Calls `CorporateRiderService.getRiderNextTrip` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:548`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:376`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:540` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:376` — directly invoked service method.

## GET `/corporate/trips/me/trips`

**Handler:** `CorporateTripExecutionController.getMyTrips` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:551`

**Purpose:** DEPRECATED: use GET /corporate/me/trips. Past trip history of the authenticated employee (EMP-08-02)

**Lifecycle:** Marked deprecated in the Swagger operation decorator.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.EMPLOYEE`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.getRiderTrips` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:559`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:285`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:551` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:285` — directly invoked service method.

## GET `/corporate/trips/driver/active-route`

**Handler:** `CorporateTripExecutionController.getDriverActiveRoute` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:565`

**Purpose:** View active corporate route assigned to the driver with ordered stops and dwell timers (UI-05-01)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.getDriverActiveRoute` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:570`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:1132`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:565` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:1132` — directly invoked service method.

## GET `/corporate/trips/driver/routes`

**Handler:** `CorporateTripExecutionController.getDriverRoutes` — `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:573`

**Purpose:** View all corporate routes assigned to the authenticated driver (UI-05-02)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTripExecutionService.getDriverCorporateTrips` at `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:578`; implementation: `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:1210`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts:573` — route decorator and handler.
- `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts:1210` — directly invoked service method.
