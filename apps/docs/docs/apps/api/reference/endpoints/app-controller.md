---
title: AppController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for AppController.
status: partial
last_reviewed: "2026-11-23"
---

# AppController Endpoint Reference

**Stable controller ID:** `API-CTRL-APP`  
**Controller source:** `apps/api/src/app.controller.ts:4`  
**Nest route prefix:** `/`  
**Swagger tags:** `Root`  
**Route methods:** 1; **decorated path variants:** 1

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/`

**Handler:** `AppController.getRoot` — `apps/api/src/app.controller.ts:7`

**Purpose:** API Root & System Metadata

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- status `200` — API status and quick reference

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/app.controller.ts:7` — route decorator and handler.
