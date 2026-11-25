---
title: SubscriptionsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for SubscriptionsController.
status: partial
last_reviewed: "2026-11-23"
---

# SubscriptionsController Endpoint Reference

**Stable controller ID:** `API-CTRL-SUBSCRIPTIONS`  
**Controller source:** `apps/api/src/modules/subscriptions/subscriptions.controller.ts:7`  
**Nest route prefix:** `subscriptions`  
**Swagger tags:** `Driver Subscriptions`  
**Route methods:** 7; **decorated path variants:** 7

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/subscriptions/my-status`

**Handler:** `SubscriptionsController.getMyStatus` — `apps/api/src/modules/subscriptions/subscriptions.controller.ts:14`

**Purpose:** Get current driver subscription & trial status

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `SubscriptionsService.getDriverSubscriptionStatus` at `apps/api/src/modules/subscriptions/subscriptions.controller.ts:18`; implementation: `apps/api/src/modules/subscriptions/subscriptions.service.ts:42`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/subscriptions/subscriptions.controller.ts:14` — route decorator and handler.
- `apps/api/src/modules/subscriptions/subscriptions.service.ts:42` — directly invoked service method.

## GET `/subscriptions/status`

**Handler:** `SubscriptionsController.getStatus` — `apps/api/src/modules/subscriptions/subscriptions.controller.ts:21`

**Purpose:** Get current driver subscription & trial status (alias)

**Alias note:** Swagger summary explicitly identifies this operation as an alias; compare related handlers in this controller.

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `SubscriptionsService.getDriverSubscriptionStatus` at `apps/api/src/modules/subscriptions/subscriptions.controller.ts:25`; implementation: `apps/api/src/modules/subscriptions/subscriptions.service.ts:42`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/subscriptions/subscriptions.controller.ts:21` — route decorator and handler.
- `apps/api/src/modules/subscriptions/subscriptions.service.ts:42` — directly invoked service method.

## POST `/subscriptions/create-order`

**Handler:** `SubscriptionsController.createSubscriptionOrder` — `apps/api/src/modules/subscriptions/subscriptions.controller.ts:28`

**Purpose:** Create Razorpay order for driver subscription payment

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: { couponCode?: string }` — `{ couponCode?: string }`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `SubscriptionsService.createSubscriptionOrder` at `apps/api/src/modules/subscriptions/subscriptions.controller.ts:35`; implementation: `apps/api/src/modules/subscriptions/subscriptions.service.ts:142`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `coupon.findUnique`, `driver.update`, `driverSubscriptionPayment.create`, `couponRedemption.create`, `coupon.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ couponCode?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/subscriptions/subscriptions.controller.ts:28` — route decorator and handler.
- `apps/api/src/modules/subscriptions/subscriptions.service.ts:142` — directly invoked service method.

## POST `/subscriptions/order`

**Handler:** `SubscriptionsController.createOrder` — `apps/api/src/modules/subscriptions/subscriptions.controller.ts:38`

**Purpose:** Create Razorpay order for driver subscription payment (alias)

**Alias note:** Swagger summary explicitly identifies this operation as an alias; compare related handlers in this controller.

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: { couponCode?: string }` — `{ couponCode?: string }`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `SubscriptionsService.createSubscriptionOrder` at `apps/api/src/modules/subscriptions/subscriptions.controller.ts:45`; implementation: `apps/api/src/modules/subscriptions/subscriptions.service.ts:142`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `coupon.findUnique`, `driver.update`, `driverSubscriptionPayment.create`, `couponRedemption.create`, `coupon.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ couponCode?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/subscriptions/subscriptions.controller.ts:38` — route decorator and handler.
- `apps/api/src/modules/subscriptions/subscriptions.service.ts:142` — directly invoked service method.

## POST `/subscriptions/verify`

**Handler:** `SubscriptionsController.verifySubscriptionPayment` — `apps/api/src/modules/subscriptions/subscriptions.controller.ts:48`

**Purpose:** Verify Razorpay payment and activate driver subscription

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: any` — `any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `SubscriptionsService.verifySubscriptionPayment` at `apps/api/src/modules/subscriptions/subscriptions.controller.ts:55`; implementation: `apps/api/src/modules/subscriptions/subscriptions.service.ts:311`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`, `driverSubscriptionPayment.create`, `coupon.findUnique`, `coupon.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/subscriptions/subscriptions.controller.ts:48` — route decorator and handler.
- `apps/api/src/modules/subscriptions/subscriptions.service.ts:311` — directly invoked service method.

## POST `/subscriptions/pay-from-wallet`

**Handler:** `SubscriptionsController.payFromWallet` — `apps/api/src/modules/subscriptions/subscriptions.controller.ts:58`

**Purpose:** Pay subscription renewal directly from driver withdrawal wallet

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: { couponCode?: string }` — `{ couponCode?: string }`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `SubscriptionsService.paySubscriptionFromWallet` at `apps/api/src/modules/subscriptions/subscriptions.controller.ts:65`; implementation: `apps/api/src/modules/subscriptions/subscriptions.service.ts:435`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `coupon.findUnique`, `driver.update`, `ledgerEntry.create`, `driverSubscriptionPayment.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ couponCode?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/subscriptions/subscriptions.controller.ts:58` — route decorator and handler.
- `apps/api/src/modules/subscriptions/subscriptions.service.ts:435` — directly invoked service method.

## POST `/subscriptions/renew-wallet`

**Handler:** `SubscriptionsController.renewWallet` — `apps/api/src/modules/subscriptions/subscriptions.controller.ts:68`

**Purpose:** Pay subscription renewal directly from driver withdrawal wallet (alias)

**Alias note:** Swagger summary explicitly identifies this operation as an alias; compare related handlers in this controller.

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: { couponCode?: string }` — `{ couponCode?: string }`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `SubscriptionsService.paySubscriptionFromWallet` at `apps/api/src/modules/subscriptions/subscriptions.controller.ts:75`; implementation: `apps/api/src/modules/subscriptions/subscriptions.service.ts:435`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `coupon.findUnique`, `driver.update`, `ledgerEntry.create`, `driverSubscriptionPayment.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ couponCode?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/subscriptions/subscriptions.controller.ts:68` — route decorator and handler.
- `apps/api/src/modules/subscriptions/subscriptions.service.ts:435` — directly invoked service method.
