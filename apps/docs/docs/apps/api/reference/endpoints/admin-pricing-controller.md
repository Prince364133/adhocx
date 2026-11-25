---
title: AdminPricingController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for AdminPricingController.
status: partial
last_reviewed: "2026-11-23"
---

# AdminPricingController Endpoint Reference

**Stable controller ID:** `API-CTRL-ADMIN-PRICING`  
**Controller source:** `apps/api/src/modules/pricing/admin-pricing.controller.ts:25`  
**Nest route prefix:** `admin/pricing`  
**Swagger tags:** `Admin Pricing Engine`  
**Route methods:** 8; **decorated path variants:** 8

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/admin/pricing/plans`

**Handler:** `AdminPricingController.listPlans` — `apps/api/src/modules/pricing/admin-pricing.controller.ts:33`

**Purpose:** List distance-based pricing plans, versions, statuses and effective dates

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(vehicleCategory)` `vehicleCategory: string` — `string`
- `@Query(status)` `status: string` — `string`

**Success response declaration:**
- status `200` — type [`[DistancePricingPlanDto]`](../request-response-dto-catalog.md#distance-pricing-plan-dto)

**Controller → service:**
- Calls `DistancePricingService.listPlans` at `apps/api/src/modules/pricing/admin-pricing.controller.ts:40`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:144`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `pricingPlan.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/admin-pricing.controller.ts:33` — route decorator and handler.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:144` — directly invoked service method.

## POST `/admin/pricing/plans`

**Handler:** `AdminPricingController.createPlan` — `apps/api/src/modules/pricing/admin-pricing.controller.ts:43`

**Purpose:** Create a new draft distance pricing plan

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Body` `dto: CreateDistancePricingPlanDto` — [`CreateDistancePricingPlanDto`](../request-response-dto-catalog.md#create-distance-pricing-plan-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `201` — type [`DistancePricingPlanDto`](../request-response-dto-catalog.md#distance-pricing-plan-dto)

**Controller → service:**
- Calls `DistancePricingService.createDraftPlan` at `apps/api/src/modules/pricing/admin-pricing.controller.ts:50`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:170`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `pricingPlan.findUnique`, `pricingPlan.findFirst`, `pricingPlan.create`, `pricingAudit.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateDistancePricingPlanDto`](../request-response-dto-catalog.md#create-distance-pricing-plan-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/admin-pricing.controller.ts:43` — route decorator and handler.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:170` — directly invoked service method.

## GET `/admin/pricing/plans/:id`

**Handler:** `AdminPricingController.getPlan` — `apps/api/src/modules/pricing/admin-pricing.controller.ts:56`

**Purpose:** Get pricing plan details with vendor and driver rates and distance boundaries

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id, ParseUUIDPipe)` `id: string`

**Success response declaration:**
- status `200` — type [`DistancePricingPlanDto`](../request-response-dto-catalog.md#distance-pricing-plan-dto)

**Controller → service:**
- Calls `DistancePricingService.getPlanById` at `apps/api/src/modules/pricing/admin-pricing.controller.ts:60`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:157`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `pricingPlan.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/admin-pricing.controller.ts:56` — route decorator and handler.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:157` — directly invoked service method.

## PUT `/admin/pricing/plans/:id/slabs`

**Handler:** `AdminPricingController.updateSlabs` — `apps/api/src/modules/pricing/admin-pricing.controller.ts:63`

**Purpose:** Update draft distance slabs with full gap and overlap validation

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id, ParseUUIDPipe)` `id: string`
- `@Body` `dto: UpdateDistancePricingSlabsDto` — [`UpdateDistancePricingSlabsDto`](../request-response-dto-catalog.md#update-distance-pricing-slabs-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`DistancePricingPlanDto`](../request-response-dto-catalog.md#distance-pricing-plan-dto)

**Controller → service:**
- Calls `DistancePricingService.updateDraftSlabs` at `apps/api/src/modules/pricing/admin-pricing.controller.ts:71`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:251`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `pricingPlan.findUnique`, `pricingPlan.update`, `pricingSlab.deleteMany`, `pricingSlab.createMany`, `pricingAudit.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateDistancePricingSlabsDto`](../request-response-dto-catalog.md#update-distance-pricing-slabs-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/admin-pricing.controller.ts:63` — route decorator and handler.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:251` — directly invoked service method.

## POST `/admin/pricing/plans/:id/publish`

**Handler:** `AdminPricingController.publishPlan` — `apps/api/src/modules/pricing/admin-pricing.controller.ts:80`

**Purpose:** Publish or schedule activation for a pricing plan version

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id, ParseUUIDPipe)` `id: string`
- `@Body` `dto: PublishPricingPlanDto` — [`PublishPricingPlanDto`](../request-response-dto-catalog.md#publish-pricing-plan-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`DistancePricingPlanDto`](../request-response-dto-catalog.md#distance-pricing-plan-dto)

**Controller → service:**
- Calls `DistancePricingService.publishPlan` at `apps/api/src/modules/pricing/admin-pricing.controller.ts:88`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:301`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `pricingPlan.findUnique`, `pricingPlan.updateMany`, `pricingPlan.update`, `pricingAudit.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`PublishPricingPlanDto`](../request-response-dto-catalog.md#publish-pricing-plan-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/admin-pricing.controller.ts:80` — route decorator and handler.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:301` — directly invoked service method.

## POST `/admin/pricing/plans/:id/retire`

**Handler:** `AdminPricingController.retirePlan` — `apps/api/src/modules/pricing/admin-pricing.controller.ts:94`

**Purpose:** Deactivate: ACTIVE -> RETIRED (quotes for the category stop) or SCHEDULED -> DRAFT

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id, ParseUUIDPipe)` `id: string`
- `@Body` `dto: RetirePricingPlanDto` — [`RetirePricingPlanDto`](../request-response-dto-catalog.md#retire-pricing-plan-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`DistancePricingPlanDto`](../request-response-dto-catalog.md#distance-pricing-plan-dto)

**Controller → service:**
- Calls `DistancePricingService.retirePlan` at `apps/api/src/modules/pricing/admin-pricing.controller.ts:102`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:371`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `pricingPlan.findUnique`, `pricingPlan.updateMany`, `pricingAudit.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`RetirePricingPlanDto`](../request-response-dto-catalog.md#retire-pricing-plan-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/admin-pricing.controller.ts:94` — route decorator and handler.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:371` — directly invoked service method.

## GET `/admin/pricing/audit`

**Handler:** `AdminPricingController.getAudit` — `apps/api/src/modules/pricing/admin-pricing.controller.ts:105`

**Purpose:** View pricing change audit trail history

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(planId)` `planId: string` — `string`

**Success response declaration:**
- status `200` — type [`[PricingAuditDto]`](../request-response-dto-catalog.md#pricing-audit-dto)

**Controller → service:**
- Calls `DistancePricingService.getAuditHistory` at `apps/api/src/modules/pricing/admin-pricing.controller.ts:109`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:448`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `pricingAudit.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/admin-pricing.controller.ts:105` — route decorator and handler.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:448` — directly invoked service method.

## POST `/admin/pricing/simulate`

**Handler:** `AdminPricingController.simulate` — `apps/api/src/modules/pricing/admin-pricing.controller.ts:112`

**Purpose:** Simulate distance-based rate resolution and margins for any distance or coordinates

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Body` `body: {
      distanceKm?: number;
      distanceMeters?: number;
      pickup?: { lat: number; lng: number; address?: string };
      drop?: { lat: number; lng: number; address?: string };
      vehicleCategory?: string;
      pickupTime?: string;
      isPeak?: boolean;
      hasEscort?: boolean;
    }` — `{       distanceKm?: number;       distanceMeters?: number;       pickup?: { lat: number; lng: number; address?: string };       drop?: { lat: number; lng: number; address?: string };       vehicleCategory?: string;       pickupTime?: string;       isPeak?: boolean;       hasEscort?: boolean;     }`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DistancePricingService.simulateCalculation` at `apps/api/src/modules/pricing/admin-pricing.controller.ts:127`; implementation: `apps/api/src/modules/pricing/distance-pricing.service.ts:814`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `pricingPlan.findUnique`, `pricingPlan.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{       distanceKm?: number;       distanceMeters?: number;       pickup?: { lat: number; lng: number; address?: string };       drop?: { lat: number; lng: number; address?: string };       vehicleCategory?: string;       pickupTime?: string;       isPeak?: boolean;       hasEscort?: boolean;     }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `HttpException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/admin-pricing.controller.ts:112` — route decorator and handler.
- `apps/api/src/modules/pricing/distance-pricing.service.ts:814` — directly invoked service method.
