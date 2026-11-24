---
title: RequirementsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for RequirementsController.
status: partial
last_reviewed: "2026-11-23"
---

# RequirementsController Endpoint Reference

**Stable controller ID:** `API-CTRL-REQUIREMENTS`  
**Controller source:** `apps/api/src/modules/requirements/requirements.controller.ts:15`  
**Nest route prefix:** `requirements`  
**Swagger tags:** `Requirements`  
**Route methods:** 6; **decorated path variants:** 6

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/requirements`

**Handler:** `RequirementsController.createRequirement` — `apps/api/src/modules/requirements/requirements.controller.ts:22`

**Purpose:** Create and post a new vehicle requirement

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: CreateRequirementDto` — [`CreateRequirementDto`](../request-response-dto-catalog.md#create-requirement-dto)

**Success response declaration:**
- status `201` — type [`RequirementResponseDto`](../request-response-dto-catalog.md#requirement-response-dto)

**Controller → service:**
- Calls `RequirementsService.createRequirement` at `apps/api/src/modules/requirements/requirements.controller.ts:30`; implementation: `apps/api/src/modules/requirements/requirements.service.ts:55`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `vendor.update`, `requirement.findUnique`, `coupon.findUnique`, `requirement.create`, `tripPricingSnapshot.create`, `ledgerEntry.create`, `payment.create`, `couponRedemption.create`, `coupon.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateRequirementDto`](../request-response-dto-catalog.md#create-requirement-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/requirements/requirements.controller.ts:22` — route decorator and handler.
- `apps/api/src/modules/requirements/requirements.service.ts:55` — directly invoked service method.

## GET `/requirements`

**Handler:** `RequirementsController.getRequirements` — `apps/api/src/modules/requirements/requirements.controller.ts:33`

**Purpose:** Get requirements created by current vendor or all requirements if admin

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Query` `query: RequirementQueryDto` — [`RequirementQueryDto`](../request-response-dto-catalog.md#requirement-query-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `RequirementsService.getAllRequirements` at `apps/api/src/modules/requirements/requirements.controller.ts:41`; implementation: `apps/api/src/modules/requirements/requirements.service.ts:464`.
- Calls `RequirementsService.getRequirementsByVendor` at `apps/api/src/modules/requirements/requirements.controller.ts:43`; implementation: `apps/api/src/modules/requirements/requirements.service.ts:364`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `requirement.findMany`, `requirement.count`, `vendor.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`RequirementQueryDto`](../request-response-dto-catalog.md#requirement-query-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/requirements/requirements.controller.ts:33` — route decorator and handler.
- `apps/api/src/modules/requirements/requirements.service.ts:464` — directly invoked service method.
- `apps/api/src/modules/requirements/requirements.service.ts:364` — directly invoked service method.

## GET `/requirements/summary`

**Handler:** `RequirementsController.getRequirementsSummary` — `apps/api/src/modules/requirements/requirements.controller.ts:46`

**Purpose:** Get aggregated requirement metrics and fulfillment counts for vendor or admin dashboard

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `RequirementsService.getAllRequirementsSummary` at `apps/api/src/modules/requirements/requirements.controller.ts:51`; implementation: `apps/api/src/modules/requirements/requirements.service.ts:516`.
- Calls `RequirementsService.getRequirementsSummary` at `apps/api/src/modules/requirements/requirements.controller.ts:53`; implementation: `apps/api/src/modules/requirements/requirements.service.ts:409`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `requirement.findMany`, `vendor.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/requirements/requirements.controller.ts:46` — route decorator and handler.
- `apps/api/src/modules/requirements/requirements.service.ts:516` — directly invoked service method.
- `apps/api/src/modules/requirements/requirements.service.ts:409` — directly invoked service method.

## GET `/requirements/:id`

**Handler:** `RequirementsController.getRequirementDetails` — `apps/api/src/modules/requirements/requirements.controller.ts:56`

**Purpose:** Get detailed requirement view including offers, remaining capacity, and assigned drivers

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`RequirementDetailResponseDto`](../request-response-dto-catalog.md#requirement-detail-response-dto)

**Controller → service:**
- Calls `RequirementsService.getRequirementDetails` at `apps/api/src/modules/requirements/requirements.controller.ts:64`; implementation: `apps/api/src/modules/requirements/requirements.service.ts:557`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `requirement.findUnique`, `requirement.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/requirements/requirements.controller.ts:56` — route decorator and handler.
- `apps/api/src/modules/requirements/requirements.service.ts:557` — directly invoked service method.

## POST `/requirements/:id/cancel`

**Handler:** `RequirementsController.cancelRequirement` — `apps/api/src/modules/requirements/requirements.controller.ts:67`

**Purpose:** Cancel a requirement

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: CancelRequirementDto` — [`CancelRequirementDto`](../request-response-dto-catalog.md#cancel-requirement-dto)

**Success response declaration:**
- status `200` — type [`RequirementResponseDto`](../request-response-dto-catalog.md#requirement-response-dto)

**Controller → service:**
- Calls `RequirementsService.cancelRequirement` at `apps/api/src/modules/requirements/requirements.controller.ts:76`; implementation: `apps/api/src/modules/requirements/requirements.service.ts:727`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `requirement.findUnique`, `requirement.updateMany`, `vendor.update`, `ledgerEntry.create`, `offer.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CancelRequirementDto`](../request-response-dto-catalog.md#cancel-requirement-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/requirements/requirements.controller.ts:67` — route decorator and handler.
- `apps/api/src/modules/requirements/requirements.service.ts:727` — directly invoked service method.

## POST `/requirements/:id/retry`

**Handler:** `RequirementsController.retryRequirement` — `apps/api/src/modules/requirements/requirements.controller.ts:79`

**Purpose:** Retry dispatch for a requirement marked NO_DRIVER_AVAILABLE

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`RequirementDetailResponseDto`](../request-response-dto-catalog.md#requirement-detail-response-dto)

**Controller → service:**
- Calls `RequirementsService.retryRequirement` at `apps/api/src/modules/requirements/requirements.controller.ts:87`; implementation: `apps/api/src/modules/requirements/requirements.service.ts:683`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`, `vendor.findUnique`, `requirement.findUnique`, `requirement.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/requirements/requirements.controller.ts:79` — route decorator and handler.
- `apps/api/src/modules/requirements/requirements.service.ts:683` — directly invoked service method.
