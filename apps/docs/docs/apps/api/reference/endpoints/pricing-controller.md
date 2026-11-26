---
title: PricingController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for PricingController.
status: partial
last_reviewed: "2026-11-23"
---

# PricingController Endpoint Reference

**Stable controller ID:** `API-CTRL-PRICING`  
**Controller source:** `apps/api/src/modules/pricing/pricing.controller.ts:22`  
**Nest route prefix:** `pricing`  
**Swagger tags:** `Vehicle Categories & Platform Policy`  
**Route methods:** 8; **decorated path variants:** 8

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/pricing`

**Handler:** `PricingController.getAllPricing` — `apps/api/src/modules/pricing/pricing.controller.ts:27`

**Purpose:** Vehicle categories (catalogue only, no prices)

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- status `200` — type [`[VehicleCategoryDto]`](../request-response-dto-catalog.md#vehicle-category-dto)

**Controller → service:**
- Calls `PricingService.getAllPricingTiers` at `apps/api/src/modules/pricing/pricing.controller.ts:31`; implementation: `apps/api/src/modules/pricing/pricing.service.ts:73`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vehiclePricingTier.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/pricing.controller.ts:27` — route decorator and handler.
- `apps/api/src/modules/pricing/pricing.service.ts:73` — directly invoked service method.

## GET `/pricing/tiers`

**Handler:** `PricingController.getPricingTiers` — `apps/api/src/modules/pricing/pricing.controller.ts:34`

**Purpose:** Vehicle categories (catalogue only, no prices)

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- status `200` — type [`[VehicleCategoryDto]`](../request-response-dto-catalog.md#vehicle-category-dto)

**Controller → service:**
- Calls `PricingService.getAllPricingTiers` at `apps/api/src/modules/pricing/pricing.controller.ts:38`; implementation: `apps/api/src/modules/pricing/pricing.service.ts:73`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vehiclePricingTier.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/pricing.controller.ts:34` — route decorator and handler.
- `apps/api/src/modules/pricing/pricing.service.ts:73` — directly invoked service method.

## POST `/pricing/admin/tiers`

**Handler:** `PricingController.createPricingTier` — `apps/api/src/modules/pricing/pricing.controller.ts:41`

**Purpose:** Add a vehicle category (Admin only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Body` `dto: CreateVehicleCategoryDto` — [`CreateVehicleCategoryDto`](../request-response-dto-catalog.md#create-vehicle-category-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `201` — type [`VehicleCategoryDto`](../request-response-dto-catalog.md#vehicle-category-dto)

**Controller → service:**
- Calls `PricingService.createPricingTier` at `apps/api/src/modules/pricing/pricing.controller.ts:48`; implementation: `apps/api/src/modules/pricing/pricing.service.ts:86`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vehiclePricingTier.findUnique`, `vehiclePricingTier.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateVehicleCategoryDto`](../request-response-dto-catalog.md#create-vehicle-category-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/pricing.controller.ts:41` — route decorator and handler.
- `apps/api/src/modules/pricing/pricing.service.ts:86` — directly invoked service method.

## DELETE `/pricing/admin/tiers/:vehicleType`

**Handler:** `PricingController.deletePricingTier` — `apps/api/src/modules/pricing/pricing.controller.ts:51`

**Purpose:** Deactivate a vehicle category (Admin only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(vehicleType)` `vehicleType: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `PricingService.deletePricingTier` at `apps/api/src/modules/pricing/pricing.controller.ts:57`; implementation: `apps/api/src/modules/pricing/pricing.service.ts:129`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vehiclePricingTier.findUnique`, `vehiclePricingTier.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/pricing.controller.ts:51` — route decorator and handler.
- `apps/api/src/modules/pricing/pricing.service.ts:129` — directly invoked service method.

## GET `/pricing/policy-config`

**Handler:** `PricingController.getPolicyConfig` — `apps/api/src/modules/pricing/pricing.controller.ts:65`

**Purpose:** Platform policy: escort fee, driver monthly fee, trial days, minimum withdrawal

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `PricingService.getPolicyConfig` at `apps/api/src/modules/pricing/pricing.controller.ts:68`; implementation: `apps/api/src/modules/pricing/pricing.service.ts:152`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `systemPolicyConfig.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/pricing.controller.ts:65` — route decorator and handler.
- `apps/api/src/modules/pricing/pricing.service.ts:152` — directly invoked service method.

## PATCH `/pricing/admin/policy-config`

**Handler:** `PricingController.updatePolicyConfig` — `apps/api/src/modules/pricing/pricing.controller.ts:71`

**Purpose:** Update platform policy settings (escort fee, driver monthly fee, etc.)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Body` `dto: UpdatePolicyConfigDto` — [`UpdatePolicyConfigDto`](../request-response-dto-catalog.md#update-policy-config-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `PricingService.updatePolicyConfig` at `apps/api/src/modules/pricing/pricing.controller.ts:77`; implementation: `apps/api/src/modules/pricing/pricing.service.ts:173`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `systemPolicyConfig.upsert`, `pricingAudit.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdatePolicyConfigDto`](../request-response-dto-catalog.md#update-policy-config-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/pricing.controller.ts:71` — route decorator and handler.
- `apps/api/src/modules/pricing/pricing.service.ts:173` — directly invoked service method.

## GET `/pricing/:vehicleType`

**Handler:** `PricingController.getPricingTier` — `apps/api/src/modules/pricing/pricing.controller.ts:80`

**Purpose:** One vehicle category

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Param(vehicleType)` `vehicleType: string`

**Success response declaration:**
- status `200` — type [`VehicleCategoryDto`](../request-response-dto-catalog.md#vehicle-category-dto)

**Controller → service:**
- Calls `PricingService.getPricingTier` at `apps/api/src/modules/pricing/pricing.controller.ts:84`; implementation: `apps/api/src/modules/pricing/pricing.service.ts:79`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vehiclePricingTier.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/pricing.controller.ts:80` — route decorator and handler.
- `apps/api/src/modules/pricing/pricing.service.ts:79` — directly invoked service method.

## PATCH `/pricing/admin/:vehicleType`

**Handler:** `PricingController.updatePricingTier` — `apps/api/src/modules/pricing/pricing.controller.ts:87`

**Purpose:** Edit a vehicle category (Admin only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(vehicleType)` `vehicleType: string`
- `@Body` `dto: UpdateVehicleCategoryDto` — [`UpdateVehicleCategoryDto`](../request-response-dto-catalog.md#update-vehicle-category-dto)
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — type [`VehicleCategoryDto`](../request-response-dto-catalog.md#vehicle-category-dto)

**Controller → service:**
- Calls `PricingService.updatePricingTier` at `apps/api/src/modules/pricing/pricing.controller.ts:98`; implementation: `apps/api/src/modules/pricing/pricing.service.ts:111`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vehiclePricingTier.findUnique`, `vehiclePricingTier.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateVehicleCategoryDto`](../request-response-dto-catalog.md#update-vehicle-category-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/pricing/pricing.controller.ts:87` — route decorator and handler.
- `apps/api/src/modules/pricing/pricing.service.ts:111` — directly invoked service method.
