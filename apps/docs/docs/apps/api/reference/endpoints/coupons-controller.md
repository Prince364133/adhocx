---
title: CouponsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CouponsController.
status: partial
last_reviewed: "2026-11-23"
---

# CouponsController Endpoint Reference

**Stable controller ID:** `API-CTRL-COUPONS`  
**Controller source:** `apps/api/src/modules/coupons/coupons.controller.ts:30`  
**Nest route prefix:** `coupons`  
**Swagger tags:** `Coupons & Promotions`  
**Route methods:** 2; **decorated path variants:** 2

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/coupons/validate`

**Handler:** `CouponsController.validateCoupon` — `apps/api/src/modules/coupons/coupons.controller.ts:35`

**Purpose:** Validate coupon code against order/booking/top-up context

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: ValidateCouponDto` — [`ValidateCouponDto`](../request-response-dto-catalog.md#validate-coupon-dto)

**Success response declaration:**
- status `200` — type [`CouponValidationResponseDto`](../request-response-dto-catalog.md#coupon-validation-response-dto)

**Controller → service:**
- Calls `CouponsService.validateCoupon` at `apps/api/src/modules/coupons/coupons.controller.ts:45`; implementation: `apps/api/src/modules/coupons/coupons.service.ts:469`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `coupon.findUnique`, `couponRedemption.count`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ValidateCouponDto`](../request-response-dto-catalog.md#validate-coupon-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/coupons/coupons.controller.ts:35` — route decorator and handler.
- `apps/api/src/modules/coupons/coupons.service.ts:469` — directly invoked service method.

## GET `/coupons/available`

**Handler:** `CouponsController.getAvailableCoupons` — `apps/api/src/modules/coupons/coupons.controller.ts:48`

**Purpose:** List available active coupons for current user

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Query(context)` `context: CouponApplicableContext` — `CouponApplicableContext`

**Success response declaration:**
- status `200` — type [`[CouponResponseDto]`](../request-response-dto-catalog.md#coupon-response-dto)

**Controller → service:**
- Calls `CouponsService.getAvailableCoupons` at `apps/api/src/modules/coupons/coupons.controller.ts:57`; implementation: `apps/api/src/modules/coupons/coupons.service.ts:580`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `coupon.findMany`, `couponRedemption.count`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `CouponApplicableContext`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/coupons/coupons.controller.ts:48` — route decorator and handler.
- `apps/api/src/modules/coupons/coupons.service.ts:580` — directly invoked service method.
