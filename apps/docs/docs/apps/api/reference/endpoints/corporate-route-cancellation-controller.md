---
title: CorporateRouteCancellationController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateRouteCancellationController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateRouteCancellationController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-ROUTE-CANCELLATION`  
**Controller source:** `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:101`  
**Nest route prefix:** `corporate/trips`  
**Swagger tags:** `Corporate ETS - Command Centre Operations`  
**Route methods:** 1; **decorated path variants:** 1

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/corporate/trips/routes/:id/cancel`

**Handler:** `CorporateRouteCancellationController.cancel` — `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:108`

**Purpose:** Cancel a route that has not started (PLANNED / DISPATCHING / ASSIGNED) with a mandatory reason. Withdraws the live offer, voids unpaid earnings, cancels open stops and their requests, notifies the driver and employees. Audited.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `routeId: string`
- `@Body` `dto: CancelRouteDto` — [`CancelRouteDto`](../request-response-dto-catalog.md#cancel-route-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Route cancelled
- status `400` — Reason missing or too short
- status `409` — Route already started, completed or cancelled, changed concurrently, or its earning is already batched

**Controller → service:**
- Calls `CorporateOperationsService.cancelRoute` at `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:120`; implementation: `apps/api/src/domains/corporate/operations/corporate-operations.service.ts:604`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`CancelRouteDto`](../request-response-dto-catalog.md#cancel-route-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/operations/corporate-operations.controller.ts:108` — route decorator and handler.
- `apps/api/src/domains/corporate/operations/corporate-operations.service.ts:604` — directly invoked service method.
