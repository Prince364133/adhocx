---
title: DriverQuoteController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for DriverQuoteController.
status: partial
last_reviewed: "2026-11-23"
---

# DriverQuoteController Endpoint Reference

**Stable controller ID:** `API-CTRL-DRIVER-QUOTE`  
**Controller source:** `apps/api/src/modules/pricing/driver-quote.controller.ts:14`  
**Nest route prefix:** `driver`  
**Swagger tags:** `Driver Trip Earnings & Rate Card`  
**Route methods:** 2; **decorated path variants:** 2

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/driver/pricing/rate-card`

**Handler:** `DriverQuoteController.getDriverRateCard` — `apps/api/src/modules/pricing/driver-quote.controller.ts:22`

**Purpose:** Return active driver-visible distance rate card directly from database

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(vehicleCategory)` `vehicleCategory: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DistancePricingService.getActiveDriverRateCard` at `apps/api/src/modules/pricing/driver-quote.controller.ts:25`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:963`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/driver-quote.controller.ts:22` — route decorator and handler.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:963` — directly invoked service method.

## GET `/driver/trips/:id`

**Handler:** `DriverQuoteController.getDriverTripDetails` — `apps/api/src/modules/pricing/driver-quote.controller.ts:28`

**Purpose:** Return driver-visible payout and route details (vendor charges and margin strictly protected)

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id, ParseUUIDPipe)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`DriverTripPayoutDto`](../request-response-dto-catalog.md#driver-trip-payout-dto)

**Controller → service:**
- Calls `DistancePricingService.getDriverTripDetails` at `apps/api/src/modules/pricing/driver-quote.controller.ts:35`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:782`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/driver-quote.controller.ts:28` — route decorator and handler.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:782` — directly invoked service method.
