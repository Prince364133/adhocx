---
title: HealthController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for HealthController.
status: partial
last_reviewed: "2026-11-23"
---

# HealthController Endpoint Reference

**Stable controller ID:** `API-CTRL-HEALTH`  
**Controller source:** `apps/api/src/modules/health/health.controller.ts:5`  
**Nest route prefix:** `health`  
**Swagger tags:** `Health`  
**Route methods:** 3; **decorated path variants:** 3

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/health`

**Handler:** `HealthController.getHealth` — `apps/api/src/modules/health/health.controller.ts:10`

**Purpose:** Comprehensive infrastructure health diagnostics

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- status `200` — Component health report

**Controller → service:**
- Calls `HealthService.checkHealth` at `apps/api/src/modules/health/health.controller.ts:14`; implementation: `apps/api/src/modules/health/health.service.ts:29`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/health/health.controller.ts:10` — route decorator and handler.
- `apps/api/src/modules/health/health.service.ts:29` — directly invoked service method.

## GET `/health/live`

**Handler:** `HealthController.getLiveness` — `apps/api/src/modules/health/health.controller.ts:17`

**Purpose:** Liveness probe

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- status `200` — Service is alive

**Controller → service:**
- Calls `HealthService.checkLiveness` at `apps/api/src/modules/health/health.controller.ts:21`; implementation: `apps/api/src/modules/health/health.service.ts:84`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/health/health.controller.ts:17` — route decorator and handler.
- `apps/api/src/modules/health/health.service.ts:84` — directly invoked service method.

## GET `/health/ready`

**Handler:** `HealthController.getReadiness` — `apps/api/src/modules/health/health.controller.ts:24`

**Purpose:** Readiness probe

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- status `200` — Service is ready to handle traffic
- status `503` — Service dependencies are degraded

**Controller → service:**
- Calls `HealthService.checkReadiness` at `apps/api/src/modules/health/health.controller.ts:29`; implementation: `apps/api/src/modules/health/health.service.ts:91`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `ServiceUnavailableException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/health/health.controller.ts:24` — route decorator and handler.
- `apps/api/src/modules/health/health.service.ts:91` — directly invoked service method.
