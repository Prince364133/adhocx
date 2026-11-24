---
title: CorporateAnalyticsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateAnalyticsController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateAnalyticsController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-ANALYTICS`  
**Controller source:** `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:17`  
**Nest route prefix:** `corporate/analytics`  
**Swagger tags:** `Corporate ETS - Analytics & Reports`  
**Route methods:** 5; **decorated path variants:** 5

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/corporate/analytics/metric-definitions`

**Handler:** `CorporateAnalyticsController.definitions` — `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:24`

**Purpose:** Numerator, denominator, status inclusion, timezone and freshness of every KPI

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateAnalyticsService.getMetricDefinitions` at `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:29`; implementation: `apps/api/src/domains/corporate/analytics/corporate-analytics.service.ts:64`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:24` — route decorator and handler.
- `apps/api/src/domains/corporate/analytics/corporate-analytics.service.ts:64` — directly invoked service method.

## GET `/corporate/analytics/dashboard`

**Handler:** `CorporateAnalyticsController.dashboard` — `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:32`

**Purpose:** KPI dashboard for an IST date range: trips by status, employees served, requests by status, on-time %, avg delay, seat utilisation, SOS count, asOf

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(officeId)` `officeId: string` — `string`
- `@Query(from)` `from: string` — `string`
- `@Query(to)` `to: string` — `string`
- `@Query(direction)` `direction: string` — `string`
- `@Query(shiftTime)` `shiftTime: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Dashboard KPIs

**Controller → service:**
- Calls `CorporateAnalyticsService.getDashboard` at `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:50`; implementation: `apps/api/src/domains/corporate/analytics/corporate-analytics.service.ts:159`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.groupBy`, `corporateTransportRequest.groupBy`, `corporateRouteStop.groupBy`, `corporateRoute.aggregate`, `corporateSosAlert.groupBy`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:32` — route decorator and handler.
- `apps/api/src/domains/corporate/analytics/corporate-analytics.service.ts:159` — directly invoked service method.

## GET `/corporate/analytics/exceptions`

**Handler:** `CorporateAnalyticsController.exceptions` — `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:62`

**Purpose:** Active operational exceptions: delayed route pickups, unassigned requests, stale GPS vehicles and safety alerts

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(officeId)` `officeId: string` — `string`
- `@Query(from)` `from: string` — `string`
- `@Query(to)` `to: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Live exceptions summary and feed

**Controller → service:**
- Calls `CorporateAnalyticsService.getExceptions` at `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:77`; implementation: `apps/api/src/domains/corporate/analytics/corporate-analytics.service.ts:602`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTransportRequest.findMany`, `corporateRouteStop.findMany`, `corporateSosAlert.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:62` — route decorator and handler.
- `apps/api/src/domains/corporate/analytics/corporate-analytics.service.ts:602` — directly invoked service method.

## GET `/corporate/analytics/attendance`

**Handler:** `CorporateAnalyticsController.attendance` — `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:86`

**Purpose:** Per-employee attendance (scheduled, boarded, no-shows, cancellations, late days), paged

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(officeId)` `officeId: string` — `string`
- `@Query(from)` `from: string` — `string`
- `@Query(to)` `to: string` — `string`
- `@Query(page)` `page: string` — `string`
- `@Query(pageSize)` `pageSize: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateAnalyticsService.getAttendance` at `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:99`; implementation: `apps/api/src/domains/corporate/analytics/corporate-analytics.service.ts:276`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:86` — route decorator and handler.
- `apps/api/src/domains/corporate/analytics/corporate-analytics.service.ts:276` — directly invoked service method.

## GET `/corporate/analytics/reports/:type`

**Handler:** `CorporateAnalyticsController.report` — `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:110`

**Purpose:** Download a report: type = trips | no-shows | attendance (optionally with .csv/.json), format=csv|json

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Param(type)` `type: string`
- `@Res` `res: Response`
- `@Query(format)` `format: string` — `string`
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(officeId)` `officeId: string` — `string`
- `@Query(from)` `from: string` — `string`
- `@Query(to)` `to: string` — `string`
- `@Query(direction)` `direction: string` — `string`
- `@Query(shiftTime)` `shiftTime: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateAnalyticsService.getReport` at `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:126`; implementation: `apps/api/src/domains/corporate/analytics/corporate-analytics.service.ts:382`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/analytics/corporate-analytics.controller.ts:110` — route decorator and handler.
- `apps/api/src/domains/corporate/analytics/corporate-analytics.service.ts:382` — directly invoked service method.
