---
title: PaymentsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for PaymentsController.
status: partial
last_reviewed: "2026-11-23"
---

# PaymentsController Endpoint Reference

**Stable controller ID:** `API-CTRL-PAYMENTS`  
**Controller source:** `apps/api/src/modules/payments/payments.controller.ts:23`  
**Nest route prefix:** `payments`  
**Swagger tags:** `Payments`  
**Route methods:** 12; **decorated path variants:** 12

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/payments/initiate`

**Handler:** `PaymentsController.initiatePayment` — `apps/api/src/modules/payments/payments.controller.ts:28`

**Purpose:** Initiate vendor payment for a requirement

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: InitiatePaymentDto` — [`InitiatePaymentDto`](../request-response-dto-catalog.md#initiate-payment-dto)

**Success response declaration:**
- status `201` — type [`PaymentResponseDto`](../request-response-dto-catalog.md#payment-response-dto)

**Controller → service:**
- Calls `PaymentsService.initiatePayment` at `apps/api/src/modules/payments/payments.controller.ts:38`; implementation: `apps/api/src/modules/payments/payments.service.ts:52`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `requirement.findUnique`, `payment.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`InitiatePaymentDto`](../request-response-dto-catalog.md#initiate-payment-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/payments/payments.controller.ts:28` — route decorator and handler.
- `apps/api/src/modules/payments/payments.service.ts:52` — directly invoked service method.

## GET `/payments/wallet`

**Handler:** `PaymentsController.getWallet` — `apps/api/src/modules/payments/payments.controller.ts:41`

**Purpose:** Get current vendor wallet overview, balance, and escrow holds

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `PaymentsService.getVendorWalletSummary` at `apps/api/src/modules/payments/payments.controller.ts:47`; implementation: `apps/api/src/modules/payments/payments.service.ts:249`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `user.findUnique`, `vendor.create`, `ledgerEntry.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/payments/payments.controller.ts:41` — route decorator and handler.
- `apps/api/src/modules/payments/payments.service.ts:249` — directly invoked service method.

## POST `/payments/wallet/top-up/create-order`

**Handler:** `PaymentsController.createTopUpOrder` — `apps/api/src/modules/payments/payments.controller.ts:50`

**Purpose:** Create Razorpay Order for Wallet Top-Up

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: any` — `any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `PaymentsService.createWalletTopUpOrder` at `apps/api/src/modules/payments/payments.controller.ts:59`; implementation: `apps/api/src/modules/payments/payments.service.ts:289`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `coupon.findUnique`, `vendor.findUnique`, `user.findUnique`, `vendor.create`, `vendor.update`, `ledgerEntry.create`, `couponRedemption.create`, `coupon.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/payments/payments.controller.ts:50` — route decorator and handler.
- `apps/api/src/modules/payments/payments.service.ts:289` — directly invoked service method.

## POST `/payments/wallet/top-up/order`

**Handler:** `PaymentsController.createTopUpOrderAlias` — `apps/api/src/modules/payments/payments.controller.ts:62`

**Purpose:** Create Razorpay Order for Wallet Top-Up (alias)

**Alias note:** Swagger summary explicitly identifies this operation as an alias; compare related handlers in this controller.

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: any` — `any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `PaymentsService.createWalletTopUpOrder` at `apps/api/src/modules/payments/payments.controller.ts:71`; implementation: `apps/api/src/modules/payments/payments.service.ts:289`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `coupon.findUnique`, `vendor.findUnique`, `user.findUnique`, `vendor.create`, `vendor.update`, `ledgerEntry.create`, `couponRedemption.create`, `coupon.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/payments/payments.controller.ts:62` — route decorator and handler.
- `apps/api/src/modules/payments/payments.service.ts:289` — directly invoked service method.

## POST `/payments/wallet/top-up/verify`

**Handler:** `PaymentsController.verifyTopUp` — `apps/api/src/modules/payments/payments.controller.ts:74`

**Purpose:** Verify payment signature and credit vendor wallet

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: any` — `any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `PaymentsService.verifyWalletTopUp` at `apps/api/src/modules/payments/payments.controller.ts:83`; implementation: `apps/api/src/modules/payments/payments.service.ts:471`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `user.findUnique`, `vendor.create`, `ledgerEntry.findFirst`, `coupon.findUnique`, `vendor.update`, `ledgerEntry.create`, `couponRedemption.create`, `coupon.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/payments/payments.controller.ts:74` — route decorator and handler.
- `apps/api/src/modules/payments/payments.service.ts:471` — directly invoked service method.

## POST `/payments/wallet/top-up/record-status`

**Handler:** `PaymentsController.recordTopUpStatus` — `apps/api/src/modules/payments/payments.controller.ts:86`

**Purpose:** Record top-up lifecycle event (cancelled by user, gateway failure)

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: any` — `any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `PaymentsService.recordTopUpStatus` at `apps/api/src/modules/payments/payments.controller.ts:95`; implementation: `apps/api/src/modules/payments/payments.service.ts:660`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `user.findUnique`, `vendor.create`, `ledgerEntry.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/payments/payments.controller.ts:86` — route decorator and handler.
- `apps/api/src/modules/payments/payments.service.ts:660` — directly invoked service method.

## GET `/payments/admin/metrics`

**Handler:** `PaymentsController.getAdminMetrics` — `apps/api/src/modules/payments/payments.controller.ts:98`

**Purpose:** Get aggregate platform payment metrics for Admin

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `PaymentsService.getAdminPaymentMetrics` at `apps/api/src/modules/payments/payments.controller.ts:104`; implementation: `apps/api/src/modules/payments/payments.service.ts:830`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `payment.findMany`, `settlement.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/payments/payments.controller.ts:98` — route decorator and handler.
- `apps/api/src/modules/payments/payments.service.ts:830` — directly invoked service method.

## GET `/payments/admin/all`

**Handler:** `PaymentsController.getAllPaymentsAdmin` — `apps/api/src/modules/payments/payments.controller.ts:107`

**Purpose:** List all platform payments across all corporate vendors for Admin

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query` `query: any` — `any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `PaymentsService.getAllAdminPayments` at `apps/api/src/modules/payments/payments.controller.ts:113`; implementation: `apps/api/src/modules/payments/payments.service.ts:777`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `payment.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/payments/payments.controller.ts:107` — route decorator and handler.
- `apps/api/src/modules/payments/payments.service.ts:777` — directly invoked service method.

## GET `/payments/wallet/transactions`

**Handler:** `PaymentsController.getWalletTransactions` — `apps/api/src/modules/payments/payments.controller.ts:116`

**Purpose:** Get vendor wallet ledger transactions

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `PaymentsService.getVendorWalletTransactions` at `apps/api/src/modules/payments/payments.controller.ts:123`; implementation: `apps/api/src/modules/payments/payments.service.ts:723`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `ledgerEntry.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/payments/payments.controller.ts:116` — route decorator and handler.
- `apps/api/src/modules/payments/payments.service.ts:723` — directly invoked service method.

## GET `/payments`

**Handler:** `PaymentsController.getPayments` — `apps/api/src/modules/payments/payments.controller.ts:126`

**Purpose:** List payments for current vendor

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`[PaymentResponseDto]`](../request-response-dto-catalog.md#payment-response-dto)

**Controller → service:**
- Calls `PaymentsService.getPaymentsByVendor` at `apps/api/src/modules/payments/payments.controller.ts:133`; implementation: `apps/api/src/modules/payments/payments.service.ts:232`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `payment.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/payments/payments.controller.ts:126` — route decorator and handler.
- `apps/api/src/modules/payments/payments.service.ts:232` — directly invoked service method.

## GET `/payments/:id`

**Handler:** `PaymentsController.getPayment` — `apps/api/src/modules/payments/payments.controller.ts:136`

**Purpose:** Get payment details by ID

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`PaymentResponseDto`](../request-response-dto-catalog.md#payment-response-dto)

**Controller → service:**
- Calls `PaymentsService.getPayment` at `apps/api/src/modules/payments/payments.controller.ts:146`; implementation: `apps/api/src/modules/payments/payments.service.ts:214`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `payment.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/payments/payments.controller.ts:136` — route decorator and handler.
- `apps/api/src/modules/payments/payments.service.ts:214` — directly invoked service method.

## POST `/payments/webhooks/:provider`

**Handler:** `PaymentsController.handleWebhook` — `apps/api/src/modules/payments/payments.controller.ts:149`

**Purpose:** Payment provider webhook endpoint (Razorpay/Stripe/mock)

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Param(provider)` `provider: string`
- `@Body` `payload: any` — `any`
- `@Headers(x-webhook-secret)` `webhookSecret: string`
- `@Headers(x-razorpay-signature)` `razorpaySignature: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `PaymentsService.handleWebhook` at `apps/api/src/modules/payments/payments.controller.ts:158`; implementation: `apps/api/src/modules/payments/payments.service.ts:104`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `payment.findUnique`, `payment.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/payments/payments.controller.ts:149` — route decorator and handler.
- `apps/api/src/modules/payments/payments.service.ts:104` — directly invoked service method.
