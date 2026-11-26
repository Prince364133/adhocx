---
title: ReferralsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for ReferralsController.
status: partial
last_reviewed: "2026-11-23"
---

# ReferralsController Endpoint Reference

**Stable controller ID:** `API-CTRL-REFERRALS`  
**Controller source:** `apps/api/src/modules/drivers/referrals/referrals.controller.ts:22`  
**Nest route prefix:** `drivers/referral`  
**Swagger tags:** `Driver Referrals`  
**Route methods:** 4; **decorated path variants:** 4

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/drivers/referral/validate`

**Handler:** `ReferralsController.validateReferrer` — `apps/api/src/modules/drivers/referrals/referrals.controller.ts:31`

**Purpose:** Validate referral code or mobile number

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Body` `dto: ValidateReferralDto` — [`ValidateReferralDto`](../request-response-dto-catalog.md#validate-referral-dto)

**Success response declaration:**
- Handler return annotation: `Promise<ValidateReferralResponseDto>`; the runtime response shape is not separately declared in Swagger.

**Controller → service:**
- Calls `ReferralsService.validateReferrer` at `apps/api/src/modules/drivers/referrals/referrals.controller.ts:36`; implementation: `apps/api/src/modules/drivers/referrals/referrals.service.ts:142`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ValidateReferralDto`](../request-response-dto-catalog.md#validate-referral-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/drivers/referrals/referrals.controller.ts:31` — route decorator and handler.
- `apps/api/src/modules/drivers/referrals/referrals.service.ts:142` — directly invoked service method.

## GET `/drivers/referral/dashboard`

**Handler:** `ReferralsController.getDashboard` — `apps/api/src/modules/drivers/referrals/referrals.controller.ts:42`

**Purpose:** Get referral dashboard, milestone progress, and list of referees

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- Handler return annotation: `Promise<DriverReferralDashboardDto>`; the runtime response shape is not separately declared in Swagger.

**Controller → service:**
- Calls `ReferralsService.getDashboard` at `apps/api/src/modules/drivers/referrals/referrals.controller.ts:50`; implementation: `apps/api/src/modules/drivers/referrals/referrals.service.ts:380`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findFirst`, `user.findUnique`, `driver.create`, `trip.count`, `driverReferral.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/drivers/referrals/referrals.controller.ts:42` — route decorator and handler.
- `apps/api/src/modules/drivers/referrals/referrals.service.ts:380` — directly invoked service method.

## POST `/drivers/referral/claim/:referralId`

**Handler:** `ReferralsController.claimReward` — `apps/api/src/modules/drivers/referrals/referrals.controller.ts:57`

**Purpose:** Claim single referral reward (Requires 100 completed rides)

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Param(referralId, ParseUUIDPipe)` `referralId: string`

**Success response declaration:**
- Handler return annotation: `Promise<ClaimReferralResponseDto>`; the runtime response shape is not separately declared in Swagger.

**Controller → service:**
- Calls `ReferralsService.claimReward` at `apps/api/src/modules/drivers/referrals/referrals.controller.ts:66`; implementation: `apps/api/src/modules/drivers/referrals/referrals.service.ts:570`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findFirst`, `driverReferral.findFirst`, `trip.count`, `driverReferral.updateMany`, `driver.update`, `ledgerEntry.create`, `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/drivers/referrals/referrals.controller.ts:57` — route decorator and handler.
- `apps/api/src/modules/drivers/referrals/referrals.service.ts:570` — directly invoked service method.

## POST `/drivers/referral/claim-all`

**Handler:** `ReferralsController.claimAllRewards` — `apps/api/src/modules/drivers/referrals/referrals.controller.ts:73`

**Purpose:** Bulk claim all eligible referral rewards

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- Handler return annotation: `Promise<ClaimReferralResponseDto>`; the runtime response shape is not separately declared in Swagger.

**Controller → service:**
- Calls `ReferralsService.claimAllRewards` at `apps/api/src/modules/drivers/referrals/referrals.controller.ts:81`; implementation: `apps/api/src/modules/drivers/referrals/referrals.service.ts:694`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findFirst`, `driverReferral.findMany`, `trip.count`, `driverReferral.updateMany`, `driver.update`, `ledgerEntry.create`, `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/drivers/referrals/referrals.controller.ts:73` — route decorator and handler.
- `apps/api/src/modules/drivers/referrals/referrals.service.ts:694` — directly invoked service method.
