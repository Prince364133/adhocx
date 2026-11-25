---
title: AdminFeatureFlagsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for AdminFeatureFlagsController.
status: partial
last_reviewed: "2026-11-23"
---

# AdminFeatureFlagsController Endpoint Reference

**Stable controller ID:** `API-CTRL-ADMIN-FEATURE-FLAGS`  
**Controller source:** `apps/api/src/modules/feature-flags/feature-flags.controller.ts:41`  
**Nest route prefix:** `admin/feature-flags`  
**Swagger tags:** `Admin Feature Flags`  
**Route methods:** 5; **decorated path variants:** 5

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/admin/feature-flags`

**Handler:** `AdminFeatureFlagsController.listAdminFeatureFlags` — `apps/api/src/modules/feature-flags/feature-flags.controller.ts:49`

**Purpose:** List all feature flags with operational metadata (Admin only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- status `200` — type [`[FeatureFlagDto]`](../request-response-dto-catalog.md#feature-flag-dto)

**Controller → service:**
- Calls `FeatureFlagsService.getAllFlags` at `apps/api/src/modules/feature-flags/feature-flags.controller.ts:53`; implementation: `apps/api/src/modules/feature-flags/feature-flags.service.ts:68`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `featureFlag.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/feature-flags/feature-flags.controller.ts:49` — route decorator and handler.
- `apps/api/src/modules/feature-flags/feature-flags.service.ts:68` — directly invoked service method.

## POST `/admin/feature-flags`

**Handler:** `AdminFeatureFlagsController.createFeatureFlag` — `apps/api/src/modules/feature-flags/feature-flags.controller.ts:56`

**Purpose:** Create a new feature flag (Admin only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Body` `dto: CreateFeatureFlagDto` — [`CreateFeatureFlagDto`](../request-response-dto-catalog.md#create-feature-flag-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `201` — type [`FeatureFlagDto`](../request-response-dto-catalog.md#feature-flag-dto)

**Controller → service:**
- Calls `FeatureFlagsService.createFlag` at `apps/api/src/modules/feature-flags/feature-flags.controller.ts:63`; implementation: `apps/api/src/modules/feature-flags/feature-flags.service.ts:137`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `featureFlag.findUnique`, `featureFlag.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateFeatureFlagDto`](../request-response-dto-catalog.md#create-feature-flag-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/feature-flags/feature-flags.controller.ts:56` — route decorator and handler.
- `apps/api/src/modules/feature-flags/feature-flags.service.ts:137` — directly invoked service method.

## PATCH `/admin/feature-flags/:key`

**Handler:** `AdminFeatureFlagsController.updateFeatureFlag` — `apps/api/src/modules/feature-flags/feature-flags.controller.ts:66`

**Purpose:** Update feature flag details and metadata (Admin only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(key)` `key: string`
- `@Body` `dto: UpdateFeatureFlagDto` — [`UpdateFeatureFlagDto`](../request-response-dto-catalog.md#update-feature-flag-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`FeatureFlagDto`](../request-response-dto-catalog.md#feature-flag-dto)

**Controller → service:**
- Calls `FeatureFlagsService.updateFlag` at `apps/api/src/modules/feature-flags/feature-flags.controller.ts:74`; implementation: `apps/api/src/modules/feature-flags/feature-flags.service.ts:162`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `featureFlag.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateFeatureFlagDto`](../request-response-dto-catalog.md#update-feature-flag-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/feature-flags/feature-flags.controller.ts:66` — route decorator and handler.
- `apps/api/src/modules/feature-flags/feature-flags.service.ts:162` — directly invoked service method.

## PATCH `/admin/feature-flags/:key/toggle`

**Handler:** `AdminFeatureFlagsController.toggleFeatureFlag` — `apps/api/src/modules/feature-flags/feature-flags.controller.ts:77`

**Purpose:** Toggle feature flag enabled/disabled state (Admin only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(key)` `key: string`
- `@Body` `dto: ToggleFeatureFlagDto` — [`ToggleFeatureFlagDto`](../request-response-dto-catalog.md#toggle-feature-flag-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`FeatureFlagDto`](../request-response-dto-catalog.md#feature-flag-dto)

**Controller → service:**
- Calls `FeatureFlagsService.toggleFlag` at `apps/api/src/modules/feature-flags/feature-flags.controller.ts:85`; implementation: `apps/api/src/modules/feature-flags/feature-flags.service.ts:181`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `featureFlag.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ToggleFeatureFlagDto`](../request-response-dto-catalog.md#toggle-feature-flag-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/feature-flags/feature-flags.controller.ts:77` — route decorator and handler.
- `apps/api/src/modules/feature-flags/feature-flags.service.ts:181` — directly invoked service method.

## DELETE `/admin/feature-flags/:key`

**Handler:** `AdminFeatureFlagsController.deleteFeatureFlag` — `apps/api/src/modules/feature-flags/feature-flags.controller.ts:88`

**Purpose:** Delete a feature flag (Admin only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(key)` `key: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `FeatureFlagsService.deleteFlag` at `apps/api/src/modules/feature-flags/feature-flags.controller.ts:91`; implementation: `apps/api/src/modules/feature-flags/feature-flags.service.ts:218`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `featureFlag.delete`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/feature-flags/feature-flags.controller.ts:88` — route decorator and handler.
- `apps/api/src/modules/feature-flags/feature-flags.service.ts:218` — directly invoked service method.
