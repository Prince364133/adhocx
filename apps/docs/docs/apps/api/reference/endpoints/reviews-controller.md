---
title: ReviewsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for ReviewsController.
status: partial
last_reviewed: "2026-11-23"
---

# ReviewsController Endpoint Reference

**Stable controller ID:** `API-CTRL-REVIEWS`  
**Controller source:** `apps/api/src/modules/reviews/reviews.controller.ts:12`  
**Nest route prefix:** `reviews`  
**Swagger tags:** `Reviews`  
**Route methods:** 3; **decorated path variants:** 3

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/reviews`

**Handler:** `ReviewsController.createReview` — `apps/api/src/modules/reviews/reviews.controller.ts:19`

**Purpose:** Submit a 1-5 star review for a completed trip

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: CreateReviewDto` — [`CreateReviewDto`](../request-response-dto-catalog.md#create-review-dto)

**Success response declaration:**
- status `201` — type [`ReviewResponseDto`](../request-response-dto-catalog.md#review-response-dto)

**Controller → service:**
- Calls `ReviewsService.createReview` at `apps/api/src/modules/reviews/reviews.controller.ts:26`; implementation: `apps/api/src/modules/reviews/reviews.service.ts:33`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findUnique`, `review.findUnique`, `review.create`, `review.findMany`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateReviewDto`](../request-response-dto-catalog.md#create-review-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ForbiddenException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/reviews/reviews.controller.ts:19` — route decorator and handler.
- `apps/api/src/modules/reviews/reviews.service.ts:33` — directly invoked service method.

## GET `/reviews/driver/:driverId`

**Handler:** `ReviewsController.getDriverReviews` — `apps/api/src/modules/reviews/reviews.controller.ts:29`

**Purpose:** Get reviews for a driver

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- `@Param(driverId)` `driverId: string`
- `@Query` `query: ReviewQueryDto` — [`ReviewQueryDto`](../request-response-dto-catalog.md#review-query-dto)

**Success response declaration:**
- status `200` — type [`[ReviewResponseDto]`](../request-response-dto-catalog.md#review-response-dto)

**Controller → service:**
- Calls `ReviewsService.getDriverReviews` at `apps/api/src/modules/reviews/reviews.controller.ts:36`; implementation: `apps/api/src/modules/reviews/reviews.service.ts:142`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `review.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ReviewQueryDto`](../request-response-dto-catalog.md#review-query-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/reviews/reviews.controller.ts:29` — route decorator and handler.
- `apps/api/src/modules/reviews/reviews.service.ts:142` — directly invoked service method.

## GET `/reviews/trip/:tripId`

**Handler:** `ReviewsController.getTripReviews` — `apps/api/src/modules/reviews/reviews.controller.ts:39`

**Purpose:** Get reviews for a trip

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- `@Param(tripId)` `tripId: string`

**Success response declaration:**
- status `200` — type [`[ReviewResponseDto]`](../request-response-dto-catalog.md#review-response-dto)

**Controller → service:**
- Calls `ReviewsService.getTripReviews` at `apps/api/src/modules/reviews/reviews.controller.ts:45`; implementation: `apps/api/src/modules/reviews/reviews.service.ts:164`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `review.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/reviews/reviews.controller.ts:39` — route decorator and handler.
- `apps/api/src/modules/reviews/reviews.service.ts:164` — directly invoked service method.
