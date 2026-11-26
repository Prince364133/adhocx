---
title: CorporateRoutingController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateRoutingController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateRoutingController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-ROUTING`  
**Controller source:** `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:47`  
**Nest route prefix:** `corporate/routes`  
**Swagger tags:** `Corporate ETS - Routing`  
**Route methods:** 17; **decorated path variants:** 17

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/corporate/routes/plan-from-file`

**Handler:** `CorporateRoutingController.planFromFile` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:59`

**Purpose:** Calculate traffic-aware routes using employee, office, and arrival details from each roster row

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@UploadedFile` `file: Express.Multer.File`
- `@Body` `body: any` — `any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:59` — route decorator and handler.

## POST `/corporate/routes/plan-stream`

**Handler:** `CorporateRoutingController.planStream` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:80`

**Purpose:** Stream route planning progress for an uploaded employee route CSV via Server-Sent Events (SSE)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@UploadedFile` `file: Express.Multer.File`
- `@Body` `body: any` — `any`
- `@Res` `res: Response`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:80` — route decorator and handler.

## POST `/corporate/routes/plan-from-file/stream`

**Handler:** `CorporateRoutingController.planFromFileStream` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:194`

**Purpose:** Alias for plan-stream via Server-Sent Events

**Alias note:** Swagger summary explicitly identifies this operation as an alias; compare related handlers in this controller.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@UploadedFile` `file: Express.Multer.File`
- `@Body` `body: any` — `any`
- `@Res` `res: Response`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:194` — route decorator and handler.

## POST `/corporate/routes/commit-plan`

**Handler:** `CorporateRoutingController.commitPlan` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:265`

**Purpose:** Commit calculated route plan into active corporate routes in the database

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Body` `body: CommitPlanDto` — [`CommitPlanDto`](../request-response-dto-catalog.md#commit-plan-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`CommitPlanDto`](../request-response-dto-catalog.md#commit-plan-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:265` — route decorator and handler.

## GET `/corporate/routes/sample-template`

**Handler:** `CorporateRoutingController.downloadSampleTemplate` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:276`

**Purpose:** Download sample Excel or CSV template for employee pickup routing

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Query(format)` `format: string` — `string`
- `@Res` `res: Response`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:276` — route decorator and handler.

## POST `/corporate/routes/export-plan`

**Handler:** `CorporateRoutingController.exportPlanToExcel` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:296`

**Purpose:** Export calculated route plan to formatted multi-sheet Excel file

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Body` `plan: PlanRoutesResult` — [`PlanRoutesResult`](../request-response-dto-catalog.md#plan-routes-result)
- `@Res` `res: Response`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`PlanRoutesResult`](../request-response-dto-catalog.md#plan-routes-result). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:296` — route decorator and handler.

## POST `/corporate/routes/optimize`

**Handler:** `CorporateRoutingController.optimizeRoutes` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:310`

**Purpose:** Plan capacity- and ride-time-constrained corporate routes for a shift on road travel times

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Body` `body: RouteOptimizationOptions` — [`RouteOptimizationOptions`](../request-response-dto-catalog.md#route-optimization-options)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `RouteSolverService.optimizeAndCreateRoutes` at `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:373`; implementation: `apps/api/src/domains/corporate/routing/route-solver.service.ts:57`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vehiclePricingTier.findMany`, `corporateOffice.findFirst`, `corporateTransportRequest.findMany`, `corporateRoute.create`, `corporateRouteStop.create`, `corporateTransportRequest.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`RouteOptimizationOptions`](../request-response-dto-catalog.md#route-optimization-options). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:310` — route decorator and handler.
- `apps/api/src/domains/corporate/routing/route-solver.service.ts:57` — directly invoked service method.

## GET `/corporate/routes`

**Handler:** `CorporateRoutingController.listRoutes` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:395`

**Purpose:** List corporate routes with optional filters (paged: limit default 500, max 1000; offset)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(shiftDate)` `shiftDate: string` — `string`
- `@Query(shiftTime)` `shiftTime: string` — `string`
- `@Query(direction)` `direction: 'LOGIN' | 'LOGOUT'` — `'LOGIN' | 'LOGOUT'`
- `@Query(status)` `status: any` — `any`
- `@Query(limit)` `limit: string` — `string`
- `@Query(offset)` `offset: string` — `string`
- `@Query(includeStops)` `includeStops: string` — `string`
- `@Query(includeAnalytics)` `includeAnalytics: string` — `string`
- `@Query(dispatchStatus)` `dispatchStatus: string` — `string`
- `@Query(search)` `search: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `'LOGIN' | 'LOGOUT'`, `any`, `string`, `string`, `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:395` — route decorator and handler.

## GET `/corporate/routes/portal`

**Handler:** `CorporateRoutingController.listPortalRoutes` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:434`

**Purpose:** List tenant-isolated routes, statuses, and stops for Corporate Portal & Ops monitoring

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(shiftDate)` `shiftDate: string` — `string`
- `@Query(shiftTime)` `shiftTime: string` — `string`
- `@Query(direction)` `direction: 'LOGIN' | 'LOGOUT'` — `'LOGIN' | 'LOGOUT'`
- `@Query(status)` `status: any` — `any`
- `@Query(limit)` `limit: string` — `string`
- `@Query(offset)` `offset: string` — `string`
- `@Query(includeStops)` `includeStops: string` — `string`
- `@Query(includeAnalytics)` `includeAnalytics: string` — `string`
- `@Query(dispatchStatus)` `dispatchStatus: string` — `string`
- `@Query(search)` `search: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `'LOGIN' | 'LOGOUT'`, `any`, `string`, `string`, `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:434` — route decorator and handler.

## POST `/corporate/routes`

**Handler:** `CorporateRoutingController.createManualRoute` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:649`

**Purpose:** Manually create a corporate route with employee stops and auto-register employee login accounts

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Body` `body: any` — `any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRoutePlannerService.createManualRoute` at `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:657`; implementation: `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:2012`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateOffice.findFirst`, `corporateRoute.create`, `corporateRouteStop.create`, `corporateTransportRequest.create`, `corporateRoute.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:649` — route decorator and handler.
- `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:2012` — directly invoked service method.

## PATCH `/corporate/routes/:id`

**Handler:** `CorporateRoutingController.updateRoute` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:660`

**Purpose:** Update an unstarted corporate route (shift, vehicle category, capacity, office)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `body: any` — `any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRoutePlannerService.updateRoute` at `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:668`; implementation: `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:2265`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`, `corporateOffice.findFirst`, `corporateRoute.update`, `corporateTransportRequest.updateMany`, `corporateRouteStop.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:660` — route decorator and handler.
- `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:2265` — directly invoked service method.

## DELETE `/corporate/routes/:id`

**Handler:** `CorporateRoutingController.deleteRoute` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:671`

**Purpose:** Delete an unstarted corporate route and its pending stops/requests

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRoutePlannerService.deleteRoute` at `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:679`; implementation: `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:2404`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`, `corporateDriverEarning.count`, `corporateDriverOffer.deleteMany`, `corporateRouteStop.deleteMany`, `corporateTransportRequest.deleteMany`, `corporateRoute.delete`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:671` — route decorator and handler.
- `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:2404` — directly invoked service method.

## POST `/corporate/routes/:id/stops`

**Handler:** `CorporateRoutingController.addRouteStop` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:682`

**Purpose:** Add an employee stop to an existing corporate route (auto-registers employee account)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `body: any` — `any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRoutePlannerService.addRouteStop` at `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:690`; implementation: `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:2437`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`, `corporateRouteStop.update`, `corporateTransportRequest.create`, `corporateRouteStop.create`, `corporateRoute.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:682` — route decorator and handler.
- `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:2437` — directly invoked service method.

## PATCH `/corporate/routes/:id/stops/:stopId`

**Handler:** `CorporateRoutingController.updateRouteStop` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:693`

**Purpose:** Edit a stop on an existing corporate route (syncs employee contact info)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Param(stopId)` `stopId: string`
- `@Body` `body: any` — `any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRoutePlannerService.updateRouteStop` at `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:701`; implementation: `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:2587`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findFirst`, `corporateRouteStop.update`, `corporateEmployee.update`, `user.findFirst`, `user.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:693` — route decorator and handler.
- `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:2587` — directly invoked service method.

## DELETE `/corporate/routes/:id/stops/:stopId`

**Handler:** `CorporateRoutingController.deleteRouteStop` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:704`

**Purpose:** Remove an unboarded employee stop from an existing corporate route

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Param(stopId)` `stopId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRoutePlannerService.deleteRouteStop` at `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:712`; implementation: `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:2674`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.findFirst`, `corporateRouteStop.delete`, `corporateTransportRequest.deleteMany`, `corporateRouteStop.findMany`, `corporateRouteStop.update`, `corporateRoute.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:704` — route decorator and handler.
- `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:2674` — directly invoked service method.

## GET `/corporate/routes/:id/directions`

**Handler:** `CorporateRoutingController.getRouteDirections` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:715`

**Purpose:** Get real-time Google Maps traffic directions, per-leg ETAs, and polyline for a route

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.DRIVER, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Query(refresh)` `refresh: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRouteDirectionsService.getDirectionsForRoute` at `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:729`; implementation: `apps/api/src/domains/corporate/routing/corporate-route-directions.service.ts:68`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:715` — route decorator and handler.
- `apps/api/src/domains/corporate/routing/corporate-route-directions.service.ts:68` — directly invoked service method.

## GET `/corporate/routes/:id`

**Handler:** `CorporateRoutingController.getRouteById` — `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:732`

**Purpose:** Get full itinerary and ordered stops for a specific corporate route

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS, UserRole.DRIVER, UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('route', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Query(includeDirections)` `includeDirections: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRouteDirectionsService.getDirectionsForRoute` at `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:838`; implementation: `apps/api/src/domains/corporate/routing/corporate-route-directions.service.ts:68`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/routing/corporate-routing.controller.ts:732` — route decorator and handler.
- `apps/api/src/domains/corporate/routing/corporate-route-directions.service.ts:68` — directly invoked service method.
