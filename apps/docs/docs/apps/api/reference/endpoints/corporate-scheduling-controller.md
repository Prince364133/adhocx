---
title: CorporateSchedulingController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateSchedulingController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateSchedulingController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-SCHEDULING`  
**Controller source:** `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:22`  
**Nest route prefix:** `corporate/scheduling`  
**Swagger tags:** `Corporate ETS - Scheduling (shift templates, holidays, auto-planner)`  
**Route methods:** 5; **decorated path variants:** 5

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/corporate/scheduling/shift-templates`

**Handler:** `CorporateSchedulingController.listShiftTemplates` — `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:32`

**Purpose:** List shift templates of a tenant (optionally one office)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(officeId)` `officeId: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateShiftTemplateService.listShiftTemplates` at `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:37`; implementation: `apps/api/src/domains/corporate/scheduling/corporate-shift-template.service.ts:78`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateShiftTemplate.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:32` — route decorator and handler.
- `apps/api/src/domains/corporate/scheduling/corporate-shift-template.service.ts:78` — directly invoked service method.

## POST `/corporate/scheduling/shift-templates`

**Handler:** `CorporateSchedulingController.createShiftTemplate` — `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:40`

**Purpose:** Create a shift template (login/logout HH:mm, ISO weekdays; overnight derived from the times)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Body` `body: CreateShiftTemplateInput & { tenantId: string }` — [`CreateShiftTemplateInput & { tenantId: string }`](../request-response-dto-catalog.md#create-shift-template-input)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateShiftTemplateService.createShiftTemplate` at `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:45`; implementation: `apps/api/src/domains/corporate/scheduling/corporate-shift-template.service.ts:33`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateShiftTemplate.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateShiftTemplateInput & { tenantId: string }`](../request-response-dto-catalog.md#create-shift-template-input). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:40` — route decorator and handler.
- `apps/api/src/domains/corporate/scheduling/corporate-shift-template.service.ts:33` — directly invoked service method.

## GET `/corporate/scheduling/holidays`

**Handler:** `CorporateSchedulingController.listHolidays` — `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:48`

**Purpose:** List holidays (tenant-wide and per office) between from / to (YYYY-MM-DD)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(from)` `from: string` — `string`
- `@Query(to)` `to: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateShiftTemplateService.listHolidays` at `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:58`; implementation: `apps/api/src/domains/corporate/scheduling/corporate-shift-template.service.ts:113`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateHoliday.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:48` — route decorator and handler.
- `apps/api/src/domains/corporate/scheduling/corporate-shift-template.service.ts:113` — directly invoked service method.

## POST `/corporate/scheduling/holidays`

**Handler:** `CorporateSchedulingController.createHoliday` — `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:61`

**Purpose:** Create a holiday (no demand is generated on publish for that shift day)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Body` `body: CreateHolidayInput & { tenantId: string }` — [`CreateHolidayInput & { tenantId: string }`](../request-response-dto-catalog.md#create-holiday-input)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateShiftTemplateService.createHoliday` at `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:66`; implementation: `apps/api/src/domains/corporate/scheduling/corporate-shift-template.service.ts:85`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateHoliday.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateHolidayInput & { tenantId: string }`](../request-response-dto-catalog.md#create-holiday-input). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ForbiddenException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:61` — route decorator and handler.
- `apps/api/src/domains/corporate/scheduling/corporate-shift-template.service.ts:85` — directly invoked service method.

## POST `/corporate/scheduling/auto-plan/run`

**Handler:** `CorporateSchedulingController.runAutoPlan` — `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:69`

**Purpose:** Run one autonomous planning pass now (ops); normally runs on its own interval

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateAutoPlannerService.tick` at `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:73`; implementation: `apps/api/src/domains/corporate/scheduling/corporate-auto-planner.service.ts:152`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/scheduling/corporate-scheduling.controller.ts:69` — route decorator and handler.
- `apps/api/src/domains/corporate/scheduling/corporate-auto-planner.service.ts:152` — directly invoked service method.
