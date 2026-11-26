---
title: SettlementsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for SettlementsController.
status: partial
last_reviewed: "2026-11-23"
---

# SettlementsController Endpoint Reference

**Stable controller ID:** `API-CTRL-SETTLEMENTS`  
**Controller source:** `apps/api/src/modules/settlements/settlements.controller.ts:24`  
**Nest route prefix:** `settlements`  
**Swagger tags:** `Settlements & Withdrawals`  
**Route methods:** 6; **decorated path variants:** 6

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/settlements/withdraw`

**Handler:** `SettlementsController.requestWithdrawal` — `apps/api/src/modules/settlements/settlements.controller.ts:31`

**Purpose:** Driver requests wallet withdrawal payout to bank

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: WithdrawalRequestDto` — [`WithdrawalRequestDto`](../request-response-dto-catalog.md#withdrawal-request-dto)

**Success response declaration:**
- status `201` — type [`SettlementResponseDto`](../request-response-dto-catalog.md#settlement-response-dto)

**Controller → service:**
- Calls `SettlementsService.requestWithdrawal` at `apps/api/src/modules/settlements/settlements.controller.ts:39`; implementation: `apps/api/src/modules/settlements/settlements.service.ts:44`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `systemPolicyConfig.findUnique`, `driver.update`, `settlement.create`, `ledgerEntry.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`WithdrawalRequestDto`](../request-response-dto-catalog.md#withdrawal-request-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/settlements/settlements.controller.ts:31` — route decorator and handler.
- `apps/api/src/modules/settlements/settlements.service.ts:44` — directly invoked service method.

## GET `/settlements/wallet`

**Handler:** `SettlementsController.getDriverWallet` — `apps/api/src/modules/settlements/settlements.controller.ts:42`

**Purpose:** Get current driver wallet balance and transaction summary

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `SettlementsService.getDriverWalletSummary` at `apps/api/src/modules/settlements/settlements.controller.ts:46`; implementation: `apps/api/src/modules/settlements/settlements.service.ts:35`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/settlements/settlements.controller.ts:42` — route decorator and handler.
- `apps/api/src/modules/settlements/settlements.service.ts:35` — directly invoked service method.

## GET `/settlements`

**Handler:** `SettlementsController.getSettlements` — `apps/api/src/modules/settlements/settlements.controller.ts:49`

**Purpose:** Get settlements (driver sees own, admin sees all)

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Query(status)` `status: SettlementStatus` — `SettlementStatus`

**Success response declaration:**
- status `200` — type [`[SettlementResponseDto]`](../request-response-dto-catalog.md#settlement-response-dto)

**Controller → service:**
- Calls `SettlementsService.listAllSettlements` at `apps/api/src/modules/settlements/settlements.controller.ts:58`; implementation: `apps/api/src/modules/settlements/settlements.service.ts:429`.
- Calls `SettlementsService.getDriverSettlements` at `apps/api/src/modules/settlements/settlements.controller.ts:60`; implementation: `apps/api/src/modules/settlements/settlements.service.ts:392`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `settlement.findMany`, `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `SettlementStatus`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/settlements/settlements.controller.ts:49` — route decorator and handler.
- `apps/api/src/modules/settlements/settlements.service.ts:429` — directly invoked service method.
- `apps/api/src/modules/settlements/settlements.service.ts:392` — directly invoked service method.

## GET `/settlements/:id`

**Handler:** `SettlementsController.getSettlement` — `apps/api/src/modules/settlements/settlements.controller.ts:63`

**Purpose:** Get single settlement by ID

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`SettlementResponseDto`](../request-response-dto-catalog.md#settlement-response-dto)

**Controller → service:**
- Calls `SettlementsService.getSettlementById` at `apps/api/src/modules/settlements/settlements.controller.ts:71`; implementation: `apps/api/src/modules/settlements/settlements.service.ts:409`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `settlement.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/settlements/settlements.controller.ts:63` — route decorator and handler.
- `apps/api/src/modules/settlements/settlements.service.ts:409` — directly invoked service method.

## POST `/settlements/:id/process`

**Handler:** `SettlementsController.processSettlement` — `apps/api/src/modules/settlements/settlements.controller.ts:74`

**Purpose:** Admin processes settlement payout (mark SETTLED or FAILED with auto-refund)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: AdminProcessSettlementDto` — [`AdminProcessSettlementDto`](../request-response-dto-catalog.md#admin-process-settlement-dto)

**Success response declaration:**
- status `200` — type [`SettlementResponseDto`](../request-response-dto-catalog.md#settlement-response-dto)

**Controller → service:**
- Calls `SettlementsService.processSettlement` at `apps/api/src/modules/settlements/settlements.controller.ts:84`; implementation: `apps/api/src/modules/settlements/settlements.service.ts:164`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `settlement.findUnique`, `settlement.update`, `driver.update`, `ledgerEntry.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`AdminProcessSettlementDto`](../request-response-dto-catalog.md#admin-process-settlement-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/settlements/settlements.controller.ts:74` — route decorator and handler.
- `apps/api/src/modules/settlements/settlements.service.ts:164` — directly invoked service method.

## POST `/settlements/:id/bank-review`

**Handler:** `SettlementsController.reviewBankDetails` — `apps/api/src/modules/settlements/settlements.controller.ts:87`

**Purpose:** Admin manually approves or rejects the bank details for a pending payout

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: { status: 'VERIFIED' | 'REJECTED'; reason?: string }` — `{ status: 'VERIFIED' | 'REJECTED'; reason?: string }`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `SettlementsService.reviewBankDetails` at `apps/api/src/modules/settlements/settlements.controller.ts:96`; implementation: `apps/api/src/modules/settlements/settlements.service.ts:316`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `settlement.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ status: 'VERIFIED' | 'REJECTED'; reason?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/settlements/settlements.controller.ts:87` — route decorator and handler.
- `apps/api/src/modules/settlements/settlements.service.ts:316` — directly invoked service method.
