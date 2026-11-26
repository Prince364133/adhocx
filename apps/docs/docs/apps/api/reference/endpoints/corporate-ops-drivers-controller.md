---
title: CorporateOpsDriversController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateOpsDriversController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateOpsDriversController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-OPS-DRIVERS`  
**Controller source:** `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:124`  
**Nest route prefix:** `corporate/ops/drivers`  
**Swagger tags:** `Corporate ETS - Command Centre Operations`  
**Route methods:** 6; **decorated path variants:** 6

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/corporate/ops/drivers`

**Handler:** `CorporateOpsDriversController.list` — `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:131`

**Purpose:** List drivers with verification and trust-score summaries

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Query(page)` `page: string` — `string`
- `@Query(pageSize)` `pageSize: string` — `string`
- `@Query(search)` `search: string` — `string`
- `@Query(verificationStatus)` `verificationStatus: string` — `string`
- `@Query(availabilityStatus)` `availabilityStatus: string` — `string`

**Success response declaration:**
- status `200` — Paged, searchable driver list

**Controller → service:**
- Calls `CorporateOpsDriversService.list` at `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:142`; implementation: `apps/api/src/domains/corporate/operations/corporate-ops-drivers.service.ts:132`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findMany`, `driver.count`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:131` — route decorator and handler.
- `apps/api/src/domains/corporate/operations/corporate-ops-drivers.service.ts:132` — directly invoked service method.

## GET `/corporate/ops/drivers/:driverId`

**Handler:** `CorporateOpsDriversController.detail` — `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:151`

**Purpose:** Get safe driver profile, verification statuses, trust score and trip/route history

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(driverId, ParseUUIDPipe)` `driverId: string`

**Success response declaration:**
- status `200` — Driver details and the latest 50 trips/routes
- status `404` — Driver not found

**Controller → service:**
- Calls `CorporateOpsDriversService.detail` at `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:157`; implementation: `apps/api/src/domains/corporate/operations/corporate-ops-drivers.service.ts:182`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:151` — route decorator and handler.
- `apps/api/src/domains/corporate/operations/corporate-ops-drivers.service.ts:182` — directly invoked service method.

## POST `/corporate/ops/drivers/:driverId/suspend`

**Handler:** `CorporateOpsDriversController.suspend` — `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:160`

**Purpose:** Suspend a verified driver; revoke existing sessions and audit the action

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(driverId, ParseUUIDPipe)` `driverId: string`
- `@Body` `dto: SuspendDriverDto` — [`SuspendDriverDto`](../request-response-dto-catalog.md#suspend-driver-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — Driver suspended
- status `400` — Invalid driver verification state or missing reason

**Controller → service:**
- Calls `CorporateOpsDriversService.suspend` at `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:171`; implementation: `apps/api/src/domains/corporate/operations/corporate-ops-drivers.service.ts:214`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`SuspendDriverDto`](../request-response-dto-catalog.md#suspend-driver-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:160` — route decorator and handler.
- `apps/api/src/domains/corporate/operations/corporate-ops-drivers.service.ts:214` — directly invoked service method.

## POST `/corporate/ops/drivers/:driverId/reactivate`

**Handler:** `CorporateOpsDriversController.reactivate` — `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:174`

**Purpose:** Reactivate a suspended driver; restore session access and audit the action

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(driverId, ParseUUIDPipe)` `driverId: string`
- `@Body` `dto: ReactivateDriverDto` — [`ReactivateDriverDto`](../request-response-dto-catalog.md#reactivate-driver-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — Driver reactivated
- status `400` — Driver is not suspended

**Controller → service:**
- Calls `CorporateOpsDriversService.reactivate` at `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:185`; implementation: `apps/api/src/domains/corporate/operations/corporate-ops-drivers.service.ts:224`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`ReactivateDriverDto`](../request-response-dto-catalog.md#reactivate-driver-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:174` — route decorator and handler.
- `apps/api/src/domains/corporate/operations/corporate-ops-drivers.service.ts:224` — directly invoked service method.

## POST `/corporate/ops/drivers/:driverId/deactivate`

**Handler:** `CorporateOpsDriversController.deactivateAccount` — `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:188`

**Purpose:** Reversibly deactivate a driver user account without deleting driver history

**Actor/access declaration:** Declared roles: `UserRole.OPS, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(driverId, ParseUUIDPipe)` `driverId: string`
- `@Body` `dto: SuspendDriverDto` — [`SuspendDriverDto`](../request-response-dto-catalog.md#suspend-driver-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — Driver user account deactivated; sessions revoked
- status `400` — Driver account is not ACTIVE or reason is missing

**Controller → service:**
- Calls `CorporateOpsDriversService.deactivateAccount` at `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:199`; implementation: `apps/api/src/domains/corporate/operations/corporate-ops-drivers.service.ts:234`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`SuspendDriverDto`](../request-response-dto-catalog.md#suspend-driver-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:188` — route decorator and handler.
- `apps/api/src/domains/corporate/operations/corporate-ops-drivers.service.ts:234` — directly invoked service method.

## POST `/corporate/ops/drivers/:driverId/activate`

**Handler:** `CorporateOpsDriversController.activateAccount` — `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:202`

**Purpose:** Restore a reversibly deactivated driver user account

**Actor/access declaration:** Declared roles: `UserRole.OPS, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(driverId, ParseUUIDPipe)` `driverId: string`
- `@Body` `dto: ReactivateDriverDto` — [`ReactivateDriverDto`](../request-response-dto-catalog.md#reactivate-driver-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — Driver user account activated
- status `400` — Driver account is not DEACTIVATED

**Controller → service:**
- Calls `CorporateOpsDriversService.activateAccount` at `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:213`; implementation: `apps/api/src/domains/corporate/operations/corporate-ops-drivers.service.ts:255`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`ReactivateDriverDto`](../request-response-dto-catalog.md#reactivate-driver-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:202` — route decorator and handler.
- `apps/api/src/domains/corporate/operations/corporate-ops-drivers.service.ts:255` — directly invoked service method.
