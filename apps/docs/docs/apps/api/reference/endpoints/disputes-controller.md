---
title: DisputesController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for DisputesController.
status: partial
last_reviewed: "2026-11-23"
---

# DisputesController Endpoint Reference

**Stable controller ID:** `API-CTRL-DISPUTES`  
**Controller source:** `apps/api/src/modules/disputes/disputes.controller.ts:15`  
**Nest route prefix:** `disputes`  
**Swagger tags:** `Disputes`  
**Route methods:** 7; **decorated path variants:** 7

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/disputes/support-query`

**Handler:** `DisputesController.createSupportQuery` — `apps/api/src/modules/disputes/disputes.controller.ts:22`

**Purpose:** Submit corporate app support query or inquiry ticket

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: CreateSupportQueryDto` — [`CreateSupportQueryDto`](../request-response-dto-catalog.md#create-support-query-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DisputesService.createSupportQuery` at `apps/api/src/modules/disputes/disputes.controller.ts:28`; implementation: `apps/api/src/modules/disputes/disputes.service.ts:236`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`, `trip.findUnique`, `dispute.create`, `leadCapture.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateSupportQueryDto`](../request-response-dto-catalog.md#create-support-query-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/disputes/disputes.controller.ts:22` — route decorator and handler.
- `apps/api/src/modules/disputes/disputes.service.ts:236` — directly invoked service method.

## GET `/disputes/support-query/my`

**Handler:** `DisputesController.getMySupportQueries` — `apps/api/src/modules/disputes/disputes.controller.ts:31`

**Purpose:** List all support queries and dispute tickets submitted by current user

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DisputesService.getMySupportQueries` at `apps/api/src/modules/disputes/disputes.controller.ts:34`; implementation: `apps/api/src/modules/disputes/disputes.service.ts:345`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`, `dispute.findMany`, `leadCapture.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/disputes/disputes.controller.ts:31` — route decorator and handler.
- `apps/api/src/modules/disputes/disputes.service.ts:345` — directly invoked service method.

## POST `/disputes`

**Handler:** `DisputesController.createDispute` — `apps/api/src/modules/disputes/disputes.controller.ts:37`

**Purpose:** File a dispute ticket for a trip

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: CreateDisputeDto` — [`CreateDisputeDto`](../request-response-dto-catalog.md#create-dispute-dto)

**Success response declaration:**
- status `201` — type [`DisputeResponseDto`](../request-response-dto-catalog.md#dispute-response-dto)

**Controller → service:**
- Calls `DisputesService.createDispute` at `apps/api/src/modules/disputes/disputes.controller.ts:44`; implementation: `apps/api/src/modules/disputes/disputes.service.ts:35`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findUnique`, `dispute.findFirst`, `dispute.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateDisputeDto`](../request-response-dto-catalog.md#create-dispute-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`, `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/disputes/disputes.controller.ts:37` — route decorator and handler.
- `apps/api/src/modules/disputes/disputes.service.ts:35` — directly invoked service method.

## GET `/disputes`

**Handler:** `DisputesController.getDisputes` — `apps/api/src/modules/disputes/disputes.controller.ts:47`

**Purpose:** List dispute tickets (Admin / Customer Care only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query` `query: DisputeQueryDto` — [`DisputeQueryDto`](../request-response-dto-catalog.md#dispute-query-dto)

**Success response declaration:**
- status `200` — type [`[DisputeResponseDto]`](../request-response-dto-catalog.md#dispute-response-dto)

**Controller → service:**
- Calls `DisputesService.getDisputes` at `apps/api/src/modules/disputes/disputes.controller.ts:54`; implementation: `apps/api/src/modules/disputes/disputes.service.ts:124`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `dispute.findMany`, `dispute.count`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`DisputeQueryDto`](../request-response-dto-catalog.md#dispute-query-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/disputes/disputes.controller.ts:47` — route decorator and handler.
- `apps/api/src/modules/disputes/disputes.service.ts:124` — directly invoked service method.

## GET `/disputes/my`

**Handler:** `DisputesController.getMyDisputes` — `apps/api/src/modules/disputes/disputes.controller.ts:57`

**Purpose:** List current user dispute tickets

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`[DisputeResponseDto]`](../request-response-dto-catalog.md#dispute-response-dto)

**Controller → service:**
- Calls `DisputesService.getUserDisputes` at `apps/api/src/modules/disputes/disputes.controller.ts:61`; implementation: `apps/api/src/modules/disputes/disputes.service.ts:208`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `dispute.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/disputes/disputes.controller.ts:57` — route decorator and handler.
- `apps/api/src/modules/disputes/disputes.service.ts:208` — directly invoked service method.

## GET `/disputes/:id`

**Handler:** `DisputesController.getDisputeById` — `apps/api/src/modules/disputes/disputes.controller.ts:64`

**Purpose:** Get dispute ticket details by ID

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`DisputeResponseDto`](../request-response-dto-catalog.md#dispute-response-dto)

**Controller → service:**
- Calls `DisputesService.getDisputeById` at `apps/api/src/modules/disputes/disputes.controller.ts:71`; implementation: `apps/api/src/modules/disputes/disputes.service.ts:219`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `dispute.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/disputes/disputes.controller.ts:64` — route decorator and handler.
- `apps/api/src/modules/disputes/disputes.service.ts:219` — directly invoked service method.

## PATCH `/disputes/:id/resolve`

**Handler:** `DisputesController.resolveDispute` — `apps/api/src/modules/disputes/disputes.controller.ts:74`

**Purpose:** Resolve or close a dispute ticket (Admin only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: ResolveDisputeDto` — [`ResolveDisputeDto`](../request-response-dto-catalog.md#resolve-dispute-dto)

**Success response declaration:**
- status `200` — type [`DisputeResponseDto`](../request-response-dto-catalog.md#dispute-response-dto)

**Controller → service:**
- Calls `DisputesService.resolveDispute` at `apps/api/src/modules/disputes/disputes.controller.ts:83`; implementation: `apps/api/src/modules/disputes/disputes.service.ts:160`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `dispute.findUnique`, `dispute.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ResolveDisputeDto`](../request-response-dto-catalog.md#resolve-dispute-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/disputes/disputes.controller.ts:74` — route decorator and handler.
- `apps/api/src/modules/disputes/disputes.service.ts:160` — directly invoked service method.
