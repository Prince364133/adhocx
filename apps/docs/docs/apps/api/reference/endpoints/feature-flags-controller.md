---
title: FeatureFlagsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for FeatureFlagsController.
status: partial
last_reviewed: "2026-11-23"
---

# FeatureFlagsController Endpoint Reference

**Stable controller ID:** `API-CTRL-FEATURE-FLAGS`  
**Controller source:** `apps/api/src/modules/feature-flags/feature-flags.controller.ts:23`  
**Nest route prefix:** `feature-flags`  
**Swagger tags:** `Feature Flags (Client)`  
**Route methods:** 2; **decorated path variants:** 2

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/feature-flags`

**Handler:** `FeatureFlagsController.getClientFeatureFlags` — `apps/api/src/modules/feature-flags/feature-flags.controller.ts:28`

**Purpose:** Get active feature flags map and list for mobile and web clients

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `FeatureFlagsService.getActiveFlags` at `apps/api/src/modules/feature-flags/feature-flags.controller.ts:31`; implementation: `apps/api/src/modules/feature-flags/feature-flags.service.ts:77`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `featureFlag.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/feature-flags/feature-flags.controller.ts:28` — route decorator and handler.
- `apps/api/src/modules/feature-flags/feature-flags.service.ts:77` — directly invoked service method.

## GET `/feature-flags/:key`

**Handler:** `FeatureFlagsController.getSingleFeatureFlag` — `apps/api/src/modules/feature-flags/feature-flags.controller.ts:34`

**Purpose:** Get single feature flag by key

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Param(key)` `key: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `FeatureFlagsService.getFlagByKey` at `apps/api/src/modules/feature-flags/feature-flags.controller.ts:37`; implementation: `apps/api/src/modules/feature-flags/feature-flags.service.ts:102`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `featureFlag.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/feature-flags/feature-flags.controller.ts:34` — route decorator and handler.
- `apps/api/src/modules/feature-flags/feature-flags.service.ts:102` — directly invoked service method.
