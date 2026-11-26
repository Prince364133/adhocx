---
title: CorporateRiderController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateRiderController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateRiderController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-RIDER`  
**Controller source:** `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:24`  
**Nest route prefix:** `corporate/me`  
**Swagger tags:** `Corporate Rider Self-Service`  
**Route methods:** 12; **decorated path variants:** 12

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/corporate/me`

**Handler:** `CorporateRiderController.getProfile` — `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:31`

**Purpose:** Get current commuter profile, tenant and office details

**Actor/access declaration:** Declared roles: `UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.getRiderProfile` at `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:36`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:102`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:31` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:102` — directly invoked service method.

## PATCH `/corporate/me`

**Handler:** `CorporateRiderController.updateProfile` — `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:39`

**Purpose:** Update current commuter profile details and default pickup address

**Actor/access declaration:** Declared roles: `UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Req` `req: any`
- `@Body` `body: { fullName?: string; email?: string; homeAddress?: string }` — `{ fullName?: string; email?: string; homeAddress?: string }`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.updateRiderProfile` at `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:44`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:819`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findFirst`, `corporateEmployee.update`, `user.update`, `corporateEmployeeLocation.update`, `corporateEmployeeLocation.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ fullName?: string; email?: string; homeAddress?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:39` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:819` — directly invoked service method.

## GET `/corporate/me/schedule`

**Handler:** `CorporateRiderController.getSchedule` — `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:47`

**Purpose:** Get upcoming 7-day shift rides schedule and modification cutoff status

**Actor/access declaration:** Declared roles: `UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Req` `req: any`
- `@Query(startDate)` `startDate: string` — `string`
- `@Query(endDate)` `endDate: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.getRiderSchedule` at `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:56`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:142`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTransportRequest.findMany`, `corporateRouteStop.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:47` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:142` — directly invoked service method.

## GET `/corporate/me/trips`

**Handler:** `CorporateRiderController.getTrips` — `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:59`

**Purpose:** Get commuter trip history with driver, vehicle and OTP details

**Actor/access declaration:** Declared roles: `UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Req` `req: any`
- `@Query(limit)` `limit: string` — `string`
- `@Query(offset)` `offset: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.getRiderTrips` at `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:68`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:285`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:59` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:285` — directly invoked service method.

## GET `/corporate/me/trips/next`

**Handler:** `CorporateRiderController.getNextTrip` — `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:75`

**Purpose:** Next active or upcoming trip card with driver, vehicle and boarding OTP (EMP-02-01)

**Actor/access declaration:** Declared roles: `UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.getRiderNextTrip` at `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:80`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:376`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:75` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:376` — directly invoked service method.

## GET `/corporate/me/trips/:id/tracking`

**Handler:** `CorporateRiderController.getTripTracking` — `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:83`

**Purpose:** Live real-time trip tracking with GPS, ETA, dwell timer and dynamic QR token

**Actor/access declaration:** Declared roles: `UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Req` `req: any`
- `@Param(id)` `id: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.getRiderTripTracking` at `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:88`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:478`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:83` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:478` — directly invoked service method.

## POST `/corporate/me/trips/:id/cancel`

**Handler:** `CorporateRiderController.cancelTripStop` — `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:91`

**Purpose:** Cancel or opt-out of an upcoming commuter route stop

**Actor/access declaration:** Declared roles: `UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Req` `req: any`
- `@Param(id)` `stopId: string`
- `@Body` `body: { reason?: string }` — `{ reason?: string }`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.cancelRiderStop` at `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:100`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:876`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findFirst`, `corporateRouteStop.update`, `corporateTransportRequest.update`, `corporateRoute.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ reason?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:91` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:876` — directly invoked service method.

## POST `/corporate/me/trips/:id/safe-reach`

**Handler:** `CorporateRiderController.submitSafeReach` — `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:103`

**Purpose:** Confirm safe residence entry for late-night female commuters

**Actor/access declaration:** Declared roles: `UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Req` `req: any`
- `@Param(id)` `stopId: string`
- `@Body` `dto: SubmitSafeReachDto` — [`SubmitSafeReachDto`](../request-response-dto-catalog.md#submit-safe-reach-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.submitSafeReach` at `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:112`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:692`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findFirst`, `corporateRouteStop.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`SubmitSafeReachDto`](../request-response-dto-catalog.md#submit-safe-reach-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:103` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:692` — directly invoked service method.

## POST `/corporate/me/trips/:id/feedback`

**Handler:** `CorporateRiderController.submitFeedback` — `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:115`

**Purpose:** Submit safety feedback and 1-5 star rating for completed ride

**Actor/access declaration:** Declared roles: `UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Req` `req: any`
- `@Param(id)` `stopId: string`
- `@Body` `dto: SubmitTripFeedbackDto` — [`SubmitTripFeedbackDto`](../request-response-dto-catalog.md#submit-trip-feedback-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.submitTripFeedback` at `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:124`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:746`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findFirst`, `corporateTripFeedback.findUnique`, `corporateTripFeedback.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`SubmitTripFeedbackDto`](../request-response-dto-catalog.md#submit-trip-feedback-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:115` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:746` — directly invoked service method.

## POST `/corporate/me/tickets`

**Handler:** `CorporateRiderController.createTicket` — `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:127`

**Purpose:** Submit commuter support ticket with auto-calculated SLA

**Actor/access declaration:** Declared roles: `UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Req` `req: any`
- `@Body` `dto: CreateSupportTicketDto` — [`CreateSupportTicketDto`](../request-response-dto-catalog.md#create-support-ticket-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.createSupportTicket` at `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:132`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:805`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`CreateSupportTicketDto`](../request-response-dto-catalog.md#create-support-ticket-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:127` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:805` — directly invoked service method.

## GET `/corporate/me/tickets`

**Handler:** `CorporateRiderController.getTickets` — `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:135`

**Purpose:** List commuter support tickets

**Actor/access declaration:** Declared roles: `UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.getRiderSupportTickets` at `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:140`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:814`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:135` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:814` — directly invoked service method.

## GET `/corporate/me/notifications`

**Handler:** `CorporateRiderController.getNotifications` — `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:143`

**Purpose:** List commuter notification events

**Actor/access declaration:** Declared roles: `UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRiderService.getRiderNotifications` at `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:148`; implementation: `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:930`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `notification.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rider/corporate-rider.controller.ts:143` — route decorator and handler.
- `apps/api/src/domains/corporate/rider/corporate-rider.service.ts:930` — directly invoked service method.
