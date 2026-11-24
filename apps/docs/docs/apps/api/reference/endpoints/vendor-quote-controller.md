---
title: VendorQuoteController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for VendorQuoteController.
status: partial
last_reviewed: "2026-11-23"
---

# VendorQuoteController Endpoint Reference

**Stable controller ID:** `API-CTRL-VENDOR-QUOTE`  
**Controller source:** `apps/api/src/modules/pricing/vendor-quote.controller.ts:24`  
**Nest route prefix:** `vendor`  
**Swagger tags:** `Vendor Trip Quotes & Bookings`  
**Route methods:** 3; **decorated path variants:** 3

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/vendor/pricing/rate-card`

**Handler:** `VendorQuoteController.getVendorRateCard` — `apps/api/src/modules/pricing/vendor-quote.controller.ts:35`

**Purpose:** Return active vendor-visible distance rate card directly from database

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(vehicleCategory)` `vehicleCategory: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DistancePricingService.getActiveVendorRateCard` at `apps/api/src/modules/pricing/vendor-quote.controller.ts:38`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:995`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/vendor-quote.controller.ts:35` — route decorator and handler.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:995` — directly invoked service method.

## POST `/vendor/trip-quotes`

**Handler:** `VendorQuoteController.createQuote` — `apps/api/src/modules/pricing/vendor-quote.controller.ts:41`

**Purpose:** Calculate vendor-visible quote from pickup, drop and vehicle category based on Google Maps road distance

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Body` `dto: VendorTripQuoteRequestDto` — [`VendorTripQuoteRequestDto`](../request-response-dto-catalog.md#vendor-trip-quote-request-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`VendorTripQuoteResponseDto`](../request-response-dto-catalog.md#vendor-trip-quote-response-dto)

**Controller → service:**
- Calls `DistancePricingService.createVendorQuote` at `apps/api/src/modules/pricing/vendor-quote.controller.ts:49`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:592`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `tripQuote.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VendorTripQuoteRequestDto`](../request-response-dto-catalog.md#vendor-trip-quote-request-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/vendor-quote.controller.ts:41` — route decorator and handler.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:592` — directly invoked service method.

## POST `/vendor/trips`

**Handler:** `VendorQuoteController.confirmTrip` — `apps/api/src/modules/pricing/vendor-quote.controller.ts:52`

**Purpose:** Confirm valid quote and lock immutable pricing snapshot for trip booking

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Body` `dto: VendorConfirmTripDto` — [`VendorConfirmTripDto`](../request-response-dto-catalog.md#vendor-confirm-trip-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DistancePricingService.findBookingForQuote` at `apps/api/src/modules/pricing/vendor-quote.controller.ts:61`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:748`.
- Calls `DistancePricingService.lockPricingSnapshotForBooking` at `apps/api/src/modules/pricing/vendor-quote.controller.ts:62`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:681`.
- Calls `RequirementsService.createRequirement` at `apps/api/src/modules/pricing/vendor-quote.controller.ts:69`; implementation: `apps/api/src/modules/requirements/requirements.service.ts:55`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `tripQuote.findUnique`, `vendor.findUnique`, `vendor.update`, `requirement.findUnique`, `coupon.findUnique`, `requirement.create`, `tripPricingSnapshot.create`, `ledgerEntry.create`, `payment.create`, `couponRedemption.create`, `coupon.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VendorConfirmTripDto`](../request-response-dto-catalog.md#vendor-confirm-trip-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/vendor-quote.controller.ts:52` — route decorator and handler.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:748` — directly invoked service method.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:681` — directly invoked service method.
- `apps/api/src/modules/requirements/requirements.service.ts:55` — directly invoked service method.
