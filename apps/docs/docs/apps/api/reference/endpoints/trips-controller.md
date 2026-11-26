---
title: TripsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for TripsController.
status: partial
last_reviewed: "2026-11-23"
---

# TripsController Endpoint Reference

**Stable controller ID:** `API-CTRL-TRIPS`  
**Controller source:** `apps/api/src/modules/trips/trips.controller.ts:18`  
**Nest route prefix:** `trips`  
**Swagger tags:** `Trips`  
**Route methods:** 13; **decorated path variants:** 14

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/trips`

**Handler:** `TripsController.getTrips` — `apps/api/src/modules/trips/trips.controller.ts:25`

**Purpose:** Get trips for current user (driver or vendor) with filters

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Query` `query: TripQueryDto` — [`TripQueryDto`](../request-response-dto-catalog.md#trip-query-dto)

**Success response declaration:**
- status `200` — type [`[TripResponseDto]`](../request-response-dto-catalog.md#trip-response-dto)

**Controller → service:**
- Calls `TripsService.getTripsForOperations` at `apps/api/src/modules/trips/trips.controller.ts:34`; implementation: `apps/api/src/modules/trips/trips.service.ts:138`.
- Calls `TripsService.getTripsForVendor` at `apps/api/src/modules/trips/trips.controller.ts:37`; implementation: `apps/api/src/modules/trips/trips.service.ts:100`.
- Calls `TripsService.getTripsForDriver` at `apps/api/src/modules/trips/trips.controller.ts:39`; implementation: `apps/api/src/modules/trips/trips.service.ts:59`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findMany`, `vendor.findUnique`, `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`TripQueryDto`](../request-response-dto-catalog.md#trip-query-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/trips/trips.controller.ts:25` — route decorator and handler.
- `apps/api/src/modules/trips/trips.service.ts:138` — directly invoked service method.
- `apps/api/src/modules/trips/trips.service.ts:100` — directly invoked service method.
- `apps/api/src/modules/trips/trips.service.ts:59` — directly invoked service method.

## GET `/trips/pending-review`

**Handler:** `TripsController.getPendingReview` — `apps/api/src/modules/trips/trips.controller.ts:42`

**Purpose:** Check if current user has an unreviewed completed trip

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `TripsService.getPendingReview` at `apps/api/src/modules/trips/trips.controller.ts:46`; implementation: `apps/api/src/modules/trips/trips.service.ts:160`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/trips/trips.controller.ts:42` — route decorator and handler.
- `apps/api/src/modules/trips/trips.service.ts:160` — directly invoked service method.

## GET `/trips/:id`

**Handler:** `TripsController.getTrip` — `apps/api/src/modules/trips/trips.controller.ts:49`

**Purpose:** Get full trip details with driver info, vehicle, and events

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`TripDetailResponseDto`](../request-response-dto-catalog.md#trip-detail-response-dto)

**Controller → service:**
- Calls `TripsService.getTripById` at `apps/api/src/modules/trips/trips.controller.ts:57`; implementation: `apps/api/src/modules/trips/trips.service.ts:195`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/trips/trips.controller.ts:49` — route decorator and handler.
- `apps/api/src/modules/trips/trips.service.ts:195` — directly invoked service method.

## GET `/trips/:id/events`

**Handler:** `TripsController.getTripEvents` — `apps/api/src/modules/trips/trips.controller.ts:60`

**Purpose:** Get GPS breadcrumbs and tracking telemetry history for route playback

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`[TripEventResponseDto]`](../request-response-dto-catalog.md#trip-event-response-dto)

**Controller → service:**
- Calls `TripsService.getTripEvents` at `apps/api/src/modules/trips/trips.controller.ts:68`; implementation: `apps/api/src/modules/trips/trips.service.ts:319`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/trips/trips.controller.ts:60` — route decorator and handler.
- `apps/api/src/modules/trips/trips.service.ts:319` — directly invoked service method.

## GET `/trips/:id/messages`

**Handler:** `TripsController.getTripMessages` — `apps/api/src/modules/trips/trips.controller.ts:71`

**Purpose:** Get chat message history for trip

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `TripsService.getTripMessages` at `apps/api/src/modules/trips/trips.controller.ts:78`; implementation: `apps/api/src/modules/trips/trips.service.ts:327`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findUnique`, `tripEvent.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/trips/trips.controller.ts:71` — route decorator and handler.
- `apps/api/src/modules/trips/trips.service.ts:327` — directly invoked service method.

## POST `/trips/:id/messages`

**Handler:** `TripsController.sendTripMessage` — `apps/api/src/modules/trips/trips.controller.ts:81`

**Purpose:** Send a chat message for this trip between driver and vendor/user

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `body: { text: string }` — `{ text: string }`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `TripsService.sendTripMessage` at `apps/api/src/modules/trips/trips.controller.ts:89`; implementation: `apps/api/src/modules/trips/trips.service.ts:372`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findUnique`, `user.findUnique`, `tripEvent.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ text: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/trips/trips.controller.ts:81` — route decorator and handler.
- `apps/api/src/modules/trips/trips.service.ts:372` — directly invoked service method.

## POST `/trips/:id/arrive` / `/trips/:id/arrived`

**Handler:** `TripsController.markArrived` — `apps/api/src/modules/trips/trips.controller.ts:92`

**Purpose:** Mark driver arrival at pickup location

**Alias group:** These 2 decorated paths share this handler: `/trips/:id/arrive`, `/trips/:id/arrived`.

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`TripResponseDto`](../request-response-dto-catalog.md#trip-response-dto)

**Controller → service:**
- Calls `TripsService.markArrived` at `apps/api/src/modules/trips/trips.controller.ts:100`; implementation: `apps/api/src/modules/trips/trips.service.ts:453`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.update`, `tripEvent.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/trips/trips.controller.ts:92` — route decorator and handler.
- `apps/api/src/modules/trips/trips.service.ts:453` — directly invoked service method.

## POST `/trips/:id/start`

**Handler:** `TripsController.startTrip` — `apps/api/src/modules/trips/trips.controller.ts:103`

**Purpose:** Start trip with OTP verification

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: StartTripDto` — [`StartTripDto`](../request-response-dto-catalog.md#start-trip-dto)

**Success response declaration:**
- status `200` — type [`TripResponseDto`](../request-response-dto-catalog.md#trip-response-dto)

**Controller → service:**
- Calls `TripsService.startTrip` at `apps/api/src/modules/trips/trips.controller.ts:112`; implementation: `apps/api/src/modules/trips/trips.service.ts:535`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.update`, `tripEvent.create`, `trip.update`, `requirement.update`, `vendor.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`StartTripDto`](../request-response-dto-catalog.md#start-trip-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/trips/trips.controller.ts:103` — route decorator and handler.
- `apps/api/src/modules/trips/trips.service.ts:535` — directly invoked service method.

## POST `/trips/:id/complete`

**Handler:** `TripsController.completeTrip` — `apps/api/src/modules/trips/trips.controller.ts:115`

**Purpose:** Complete trip, compute earnings, and release driver

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: CompleteTripDto` — [`CompleteTripDto`](../request-response-dto-catalog.md#complete-trip-dto)

**Success response declaration:**
- status `200` — type [`TripResponseDto`](../request-response-dto-catalog.md#trip-response-dto)

**Controller → service:**
- Calls `TripsService.completeTrip` at `apps/api/src/modules/trips/trips.controller.ts:124`; implementation: `apps/api/src/modules/trips/trips.service.ts:736`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.updateMany`, `trip.findUnique`, `assignment.update`, `driver.update`, `driver.updateMany`, `ledgerEntry.create`, `trip.count`, `requirement.update`, `tripEvent.create`, `vendor.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CompleteTripDto`](../request-response-dto-catalog.md#complete-trip-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/trips/trips.controller.ts:115` — route decorator and handler.
- `apps/api/src/modules/trips/trips.service.ts:736` — directly invoked service method.

## POST `/trips/:id/cancel`

**Handler:** `TripsController.cancelTrip` — `apps/api/src/modules/trips/trips.controller.ts:127`

**Purpose:** Cancel a trip (pre-start cancellation automatically redispatches requirement)

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: CancelTripDto` — [`CancelTripDto`](../request-response-dto-catalog.md#cancel-trip-dto)

**Success response declaration:**
- status `200` — type [`TripResponseDto`](../request-response-dto-catalog.md#trip-response-dto)

**Controller → service:**
- Calls `TripsService.cancelTrip` at `apps/api/src/modules/trips/trips.controller.ts:136`; implementation: `apps/api/src/modules/trips/trips.service.ts:1025`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findUnique`, `trip.updateMany`, `assignment.update`, `driver.update`, `driver.updateMany`, `requirement.updateMany`, `requirement.findUnique`, `requirement.update`, `tripEvent.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CancelTripDto`](../request-response-dto-catalog.md#cancel-trip-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/trips/trips.controller.ts:127` — route decorator and handler.
- `apps/api/src/modules/trips/trips.service.ts:1025` — directly invoked service method.

## POST `/trips/:id/no-show`

**Handler:** `TripsController.reportNoShow` — `apps/api/src/modules/trips/trips.controller.ts:139`

**Purpose:** Report passenger no-show after driver arrival

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`TripResponseDto`](../request-response-dto-catalog.md#trip-response-dto)

**Controller → service:**
- Calls `TripsService.reportNoShow` at `apps/api/src/modules/trips/trips.controller.ts:147`; implementation: `apps/api/src/modules/trips/trips.service.ts:1175`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.update`, `assignment.update`, `driver.update`, `tripEvent.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/trips/trips.controller.ts:139` — route decorator and handler.
- `apps/api/src/modules/trips/trips.service.ts:1175` — directly invoked service method.

## PATCH `/trips/:id/location`

**Handler:** `TripsController.updateLocation` — `apps/api/src/modules/trips/trips.controller.ts:150`

**Purpose:** Stream driver GPS telemetry update during active trip

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: TripLocationUpdateDto` — [`TripLocationUpdateDto`](../request-response-dto-catalog.md#trip-location-update-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `TripsService.updateLocation` at `apps/api/src/modules/trips/trips.controller.ts:158`; implementation: `apps/api/src/modules/trips/trips.service.ts:628`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.update`, `tripEvent.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`TripLocationUpdateDto`](../request-response-dto-catalog.md#trip-location-update-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/trips/trips.controller.ts:150` — route decorator and handler.
- `apps/api/src/modules/trips/trips.service.ts:628` — directly invoked service method.

## POST `/trips/:id/sos`

**Handler:** `TripsController.triggerSos` — `apps/api/src/modules/trips/trips.controller.ts:162`

**Purpose:** Trigger emergency SOS alert for an active trip

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `body: { latitude?: number; longitude?: number; note?: string }` — `{ latitude?: number; longitude?: number; note?: string }`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `TripsService.triggerEmergencySos` at `apps/api/src/modules/trips/trips.controller.ts:170`; implementation: `apps/api/src/modules/trips/trips.service.ts:1233`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findUnique`, `tripEvent.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ latitude?: number; longitude?: number; note?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/trips/trips.controller.ts:162` — route decorator and handler.
- `apps/api/src/modules/trips/trips.service.ts:1233` — directly invoked service method.
