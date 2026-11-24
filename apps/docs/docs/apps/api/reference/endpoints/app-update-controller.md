---
title: AppUpdateController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for AppUpdateController.
status: partial
last_reviewed: "2026-11-23"
---

# AppUpdateController Endpoint Reference

**Stable controller ID:** `API-CTRL-APP-UPDATE`  
**Controller source:** `apps/api/src/modules/app-update/app-update.controller.ts:6`  
**Nest route prefix:** `app`  
**Swagger tags:** `App Update`  
**Route methods:** 1; **decorated path variants:** 1

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/app/version`

**Handler:** `AppUpdateController.getVersion` — `apps/api/src/modules/app-update/app-update.controller.ts:11`

**Purpose:** Get latest release version metadata and check for updates

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Query` `query: AppVersionQueryDto` — [`AppVersionQueryDto`](../request-response-dto-catalog.md#app-version-query-dto)

**Success response declaration:**
- status `200` — Latest app version metadata — type [`AppVersionResponseDto`](../request-response-dto-catalog.md#app-version-response-dto)

**Controller → service:**
- Calls `AppUpdateService.getVersionInfo` at `apps/api/src/modules/app-update/app-update.controller.ts:15`; implementation: `apps/api/src/modules/app-update/app-update.service.ts:9`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`AppVersionQueryDto`](../request-response-dto-catalog.md#app-version-query-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/app-update/app-update.controller.ts:11` — route decorator and handler.
- `apps/api/src/modules/app-update/app-update.service.ts:9` — directly invoked service method.
