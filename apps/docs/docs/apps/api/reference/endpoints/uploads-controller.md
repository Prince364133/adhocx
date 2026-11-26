---
title: UploadsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for UploadsController.
status: partial
last_reviewed: "2026-11-23"
---

# UploadsController Endpoint Reference

**Stable controller ID:** `API-CTRL-UPLOADS`  
**Controller source:** `apps/api/src/common/storage/uploads.controller.ts:18`  
**Nest route prefix:** `/`  
**Swagger tags:** `Uploads`  
**Route methods:** 2; **decorated path variants:** 4

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/private-uploads/:filename` / `/api/v1/private-uploads/:filename`

**Handler:** `UploadsController.getPrivateUploadedFile` — `apps/api/src/common/storage/uploads.controller.ts:26`

**Purpose:** Serve a private ticket attachment via a short-lived signed capability URL

**Alias group:** These 2 decorated paths share this handler: `/private-uploads/:filename`, `/api/v1/private-uploads/:filename`.

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Param(filename)` `filename: string`
- `@Res` `res: Response`
- `@Query(provider)` `provider: string` — `string`
- `@Query(exp)` `exp: string` — `string`
- `@Query(sig)` `sig: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `StorageService.getPrivateFileBuffer` at `apps/api/src/common/storage/uploads.controller.ts:41`; implementation: `apps/api/src/common/storage/storage.service.ts:295`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ForbiddenException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/common/storage/uploads.controller.ts:26` — route decorator and handler.
- `apps/api/src/common/storage/storage.service.ts:295` — directly invoked service method.

## GET `/uploads/:filename` / `/api/v1/uploads/:filename`

**Handler:** `UploadsController.getUploadedFile` — `apps/api/src/common/storage/uploads.controller.ts:50`

**Purpose:** Serve locally stored uploaded documents and images

**Alias group:** These 2 decorated paths share this handler: `/uploads/:filename`, `/api/v1/uploads/:filename`.

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Param(filename)` `filename: string`
- `@Res` `res: Response`
- `@Query(exp)` `exp: string` — `string`
- `@Query(sig)` `sig: string` — `string`

**Success response declaration:**
- status `200` — File delivered successfully
- status `404` — File not found

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ForbiddenException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/common/storage/uploads.controller.ts:50` — route decorator and handler.
