---
title: OffersController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for OffersController.
status: partial
last_reviewed: "2026-11-23"
---

# OffersController Endpoint Reference

**Stable controller ID:** `API-CTRL-OFFERS`  
**Controller source:** `apps/api/src/modules/offers/offers.controller.ts:13`  
**Nest route prefix:** `offers`  
**Swagger tags:** `Offers`  
**Route methods:** 5; **decorated path variants:** 5

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/offers`

**Handler:** `OffersController.getOffers` — `apps/api/src/modules/offers/offers.controller.ts:20`

**Purpose:** Get trip offers sent to current driver

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Query` `query: OfferQueryDto` — [`OfferQueryDto`](../request-response-dto-catalog.md#offer-query-dto)

**Success response declaration:**
- status `200` — type [`[OfferResponseDto]`](../request-response-dto-catalog.md#offer-response-dto)

**Controller → service:**
- Calls `OffersService.getOffersForDriver` at `apps/api/src/modules/offers/offers.controller.ts:28`; implementation: `apps/api/src/modules/offers/offers.service.ts:66`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `user.findUnique`, `driver.create`, `trip.findMany`, `offer.findMany`, `offer.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`OfferQueryDto`](../request-response-dto-catalog.md#offer-query-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/offers/offers.controller.ts:20` — route decorator and handler.
- `apps/api/src/modules/offers/offers.service.ts:66` — directly invoked service method.

## GET `/offers/:id`

**Handler:** `OffersController.getOfferById` — `apps/api/src/modules/offers/offers.controller.ts:31`

**Purpose:** Get a single trip offer by ID with authoritative status and expiry

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id, ParseUUIDPipe)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`OfferResponseDto`](../request-response-dto-catalog.md#offer-response-dto)

**Controller → service:**
- Calls `OffersService.getOfferById` at `apps/api/src/modules/offers/offers.controller.ts:39`; implementation: `apps/api/src/modules/offers/offers.service.ts:157`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `offer.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `ForbiddenException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/offers/offers.controller.ts:31` — route decorator and handler.
- `apps/api/src/modules/offers/offers.service.ts:157` — directly invoked service method.

## POST `/offers/:id/accept`

**Handler:** `OffersController.acceptOffer` — `apps/api/src/modules/offers/offers.controller.ts:42`

**Purpose:** Accept a trip offer (atomically allocates capacity, creates assignment & trip)

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`OfferResponseDto`](../request-response-dto-catalog.md#offer-response-dto)

**Controller → service:**
- Calls `OffersService.acceptOffer` at `apps/api/src/modules/offers/offers.controller.ts:50`; implementation: `apps/api/src/modules/offers/offers.service.ts:251`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `offer.findUnique`, `offer.updateMany`, `driver.update`, `trip.count`, `requirement.updateMany`, `requirement.findUnique`, `requirement.update`, `assignment.create`, `trip.create`, `tripPricingSnapshot.findUnique`, `tripPricingSnapshot.update`, `offer.findMany`, `vendor.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `ForbiddenException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/offers/offers.controller.ts:42` — route decorator and handler.
- `apps/api/src/modules/offers/offers.service.ts:251` — directly invoked service method.

## POST `/offers/:id/decline`

**Handler:** `OffersController.declineOffer` — `apps/api/src/modules/offers/offers.controller.ts:53`

**Purpose:** Decline a trip offer (triggers redispatch for next candidate)

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: DeclineOfferDto` — [`DeclineOfferDto`](../request-response-dto-catalog.md#decline-offer-dto)

**Success response declaration:**
- status `200` — type [`OfferResponseDto`](../request-response-dto-catalog.md#offer-response-dto)

**Controller → service:**
- Calls `OffersService.declineOffer` at `apps/api/src/modules/offers/offers.controller.ts:62`; implementation: `apps/api/src/modules/offers/offers.service.ts:549`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `offer.findUnique`, `offer.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`DeclineOfferDto`](../request-response-dto-catalog.md#decline-offer-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/offers/offers.controller.ts:53` — route decorator and handler.
- `apps/api/src/modules/offers/offers.service.ts:549` — directly invoked service method.

## POST `/offers/:id/seen`

**Handler:** `OffersController.markSeen` — `apps/api/src/modules/offers/offers.controller.ts:65`

**Purpose:** Delivery receipt: driver app displayed this offer

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `OffersService.markOfferSeen` at `apps/api/src/modules/offers/offers.controller.ts:69`; implementation: `apps/api/src/modules/offers/offers.service.ts:46`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `offer.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/offers/offers.controller.ts:65` — route decorator and handler.
- `apps/api/src/modules/offers/offers.service.ts:46` — directly invoked service method.
