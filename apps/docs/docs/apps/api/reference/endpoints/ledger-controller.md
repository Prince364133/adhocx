---
title: LedgerController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for LedgerController.
status: partial
last_reviewed: "2026-11-23"
---

# LedgerController Endpoint Reference

**Stable controller ID:** `API-CTRL-LEDGER`  
**Controller source:** `apps/api/src/modules/ledger/ledger.controller.ts:12`  
**Nest route prefix:** `driver`  
**Swagger tags:** `Driver Wallet & Ledger`  
**Route methods:** 2; **decorated path variants:** 2

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/driver/wallet`

**Handler:** `LedgerController.getWallet` — `apps/api/src/modules/ledger/ledger.controller.ts:19`

**Purpose:** Get current driver wallet summary (balance, earnings, settlements)

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`DriverWalletSummaryDto`](../request-response-dto-catalog.md#driver-wallet-summary-dto)

**Controller → service:**
- Calls `LedgerService.getDriverWalletSummary` at `apps/api/src/modules/ledger/ledger.controller.ts:24`; implementation: `apps/api/src/modules/ledger/ledger.service.ts:252`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `ledgerEntry.findMany`, `settlement.findMany`, `trip.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/ledger/ledger.controller.ts:19` — route decorator and handler.
- `apps/api/src/modules/ledger/ledger.service.ts:252` — directly invoked service method.

## GET `/driver/ledger`

**Handler:** `LedgerController.getLedger` — `apps/api/src/modules/ledger/ledger.controller.ts:27`

**Purpose:** Get driver immutable ledger transactions history

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`[LedgerEntryResponseDto]`](../request-response-dto-catalog.md#ledger-entry-response-dto)

**Controller → service:**
- Calls `LedgerService.getDriverWalletSummary` at `apps/api/src/modules/ledger/ledger.controller.ts:32`; implementation: `apps/api/src/modules/ledger/ledger.service.ts:252`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `ledgerEntry.findMany`, `settlement.findMany`, `trip.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/ledger/ledger.controller.ts:27` — route decorator and handler.
- `apps/api/src/modules/ledger/ledger.service.ts:252` — directly invoked service method.
