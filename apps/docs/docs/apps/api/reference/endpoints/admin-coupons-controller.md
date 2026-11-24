---
title: AdminCouponsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for AdminCouponsController.
status: partial
last_reviewed: "2026-11-23"
---

# AdminCouponsController Endpoint Reference

**Stable controller ID:** `API-CTRL-ADMIN-COUPONS`  
**Controller source:** `apps/api/src/modules/coupons/coupons.controller.ts:61`  
**Nest route prefix:** `admin/coupons`  
**Swagger tags:** `Admin Coupon Operations`  
**Route methods:** 7; **decorated path variants:** 7

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/admin/coupons/metrics`

**Handler:** `AdminCouponsController.getCouponMetrics` — `apps/api/src/modules/coupons/coupons.controller.ts:69`

**Purpose:** Get coupon KPI metrics for admin overview

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- status `200` — type [`CouponMetricsDto`](../request-response-dto-catalog.md#coupon-metrics-dto)

**Controller → service:**
- Calls `CouponsService.getCouponMetrics` at `apps/api/src/modules/coupons/coupons.controller.ts:73`; implementation: `apps/api/src/modules/coupons/coupons.service.ts:120`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `coupon.count`, `couponRedemption.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/coupons/coupons.controller.ts:69` — route decorator and handler.
- `apps/api/src/modules/coupons/coupons.service.ts:120` — directly invoked service method.

## GET `/admin/coupons`

**Handler:** `AdminCouponsController.listCoupons` — `apps/api/src/modules/coupons/coupons.controller.ts:76`

**Purpose:** List all promotional coupons with filters

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(status)` `status: string` — `string`
- `@Query(search)` `search: string` — `string`
- `@Query(applicableTo)` `applicableTo: string` — `string`

**Success response declaration:**
- status `200` — type [`[CouponResponseDto]`](../request-response-dto-catalog.md#coupon-response-dto)

**Controller → service:**
- Calls `CouponsService.listCoupons` at `apps/api/src/modules/coupons/coupons.controller.ts:84`; implementation: `apps/api/src/modules/coupons/coupons.service.ts:34`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `coupon.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/coupons/coupons.controller.ts:76` — route decorator and handler.
- `apps/api/src/modules/coupons/coupons.service.ts:34` — directly invoked service method.

## GET `/admin/coupons/:id`

**Handler:** `AdminCouponsController.getCouponById` — `apps/api/src/modules/coupons/coupons.controller.ts:87`

**Purpose:** Get coupon details by ID

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`

**Success response declaration:**
- status `200` — type [`CouponResponseDto`](../request-response-dto-catalog.md#coupon-response-dto)

**Controller → service:**
- Calls `CouponsService.getCouponById` at `apps/api/src/modules/coupons/coupons.controller.ts:91`; implementation: `apps/api/src/modules/coupons/coupons.service.ts:152`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `coupon.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/coupons/coupons.controller.ts:87` — route decorator and handler.
- `apps/api/src/modules/coupons/coupons.service.ts:152` — directly invoked service method.

## POST `/admin/coupons`

**Handler:** `AdminCouponsController.createCoupon` — `apps/api/src/modules/coupons/coupons.controller.ts:94`

**Purpose:** Create new promotional coupon

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: CreateCouponDto` — [`CreateCouponDto`](../request-response-dto-catalog.md#create-coupon-dto)

**Success response declaration:**
- status `201` — type [`CouponResponseDto`](../request-response-dto-catalog.md#coupon-response-dto)

**Controller → service:**
- Calls `CouponsService.createCoupon` at `apps/api/src/modules/coupons/coupons.controller.ts:101`; implementation: `apps/api/src/modules/coupons/coupons.service.ts:198`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `coupon.findUnique`, `coupon.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateCouponDto`](../request-response-dto-catalog.md#create-coupon-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ConflictException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/coupons/coupons.controller.ts:94` — route decorator and handler.
- `apps/api/src/modules/coupons/coupons.service.ts:198` — directly invoked service method.

## PATCH `/admin/coupons/:id`

**Handler:** `AdminCouponsController.updateCoupon` — `apps/api/src/modules/coupons/coupons.controller.ts:104`

**Purpose:** Update coupon properties or status

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: UpdateCouponDto` — [`UpdateCouponDto`](../request-response-dto-catalog.md#update-coupon-dto)

**Success response declaration:**
- status `200` — type [`CouponResponseDto`](../request-response-dto-catalog.md#coupon-response-dto)

**Controller → service:**
- Calls `CouponsService.updateCoupon` at `apps/api/src/modules/coupons/coupons.controller.ts:112`; implementation: `apps/api/src/modules/coupons/coupons.service.ts:290`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `coupon.findUnique`, `coupon.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateCouponDto`](../request-response-dto-catalog.md#update-coupon-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/coupons/coupons.controller.ts:104` — route decorator and handler.
- `apps/api/src/modules/coupons/coupons.service.ts:290` — directly invoked service method.

## DELETE `/admin/coupons/:id`

**Handler:** `AdminCouponsController.deleteCoupon` — `apps/api/src/modules/coupons/coupons.controller.ts:115`

**Purpose:** Delete or deactivate coupon

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CouponsService.deleteCoupon` at `apps/api/src/modules/coupons/coupons.controller.ts:121`; implementation: `apps/api/src/modules/coupons/coupons.service.ts:380`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `coupon.findUnique`, `coupon.update`, `coupon.delete`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/coupons/coupons.controller.ts:115` — route decorator and handler.
- `apps/api/src/modules/coupons/coupons.service.ts:380` — directly invoked service method.

## GET `/admin/coupons/:id/redemptions`

**Handler:** `AdminCouponsController.getCouponRedemptions` — `apps/api/src/modules/coupons/coupons.controller.ts:124`

**Purpose:** Get audit log of redemptions for a coupon

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`

**Success response declaration:**
- status `200` — type [`[CouponRedemptionResponseDto]`](../request-response-dto-catalog.md#coupon-redemption-response-dto)

**Controller → service:**
- Calls `CouponsService.getCouponRedemptions` at `apps/api/src/modules/coupons/coupons.controller.ts:128`; implementation: `apps/api/src/modules/coupons/coupons.service.ts:427`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `couponRedemption.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/coupons/coupons.controller.ts:124` — route decorator and handler.
- `apps/api/src/modules/coupons/coupons.service.ts:427` — directly invoked service method.
