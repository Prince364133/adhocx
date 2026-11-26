---
title: CorporateRateCardController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateRateCardController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateRateCardController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-RATE-CARD`  
**Controller source:** `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:23`  
**Nest route prefix:** `corporate/billing/rate-cards`  
**Swagger tags:** `Corporate ETS - Rate Cards`  
**Route methods:** 6; **decorated path variants:** 6

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/corporate/billing/rate-cards/corporate`

**Handler:** `CorporateRateCardController.createCorporateCard` — `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:30`

**Purpose:** Create a new corporate rate card version (closes the previous version at effectiveFrom)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Body` `dto: CreateCorporateRateCardDto` — [`CreateCorporateRateCardDto`](../request-response-dto-catalog.md#create-corporate-rate-card-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `201` — Version created
- status `409` — Would change the price of already-invoiced trips

**Controller → service:**
- Calls `CorporateRateCardAdminService.createCorporateCard` at `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:36`; implementation: `apps/api/src/domains/corporate/billing/corporate-rate-card-admin.service.ts:49`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.findUnique`, `corporateRateCard.findFirst`, `corporateRateCard.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateCorporateRateCardDto`](../request-response-dto-catalog.md#create-corporate-rate-card-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:30` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-rate-card-admin.service.ts:49` — directly invoked service method.

## GET `/corporate/billing/rate-cards/corporate`

**Handler:** `CorporateRateCardController.listCorporateCards` — `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:39`

**Purpose:** List corporate rate card versions (corporate roles: own tenant only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`, `CorporatePermission('invoices:read')`.

**Request inputs:**
- `@Req` `req: any`
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(vehicleCategory)` `vehicleCategory: string` — `string`
- `@Query(at)` `at: string` — `string`
- `@Query(includeRetired)` `includeRetired: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRateCardAdminService.listCorporateCards` at `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:51`; implementation: `apps/api/src/domains/corporate/billing/corporate-rate-card-admin.service.ts:99`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:39` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-rate-card-admin.service.ts:99` — directly invoked service method.

## POST `/corporate/billing/rate-cards/corporate/:id/retire`

**Handler:** `CorporateRateCardController.retireCorporateCard` — `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:54`

**Purpose:** Retire a corporate rate card version (sets effectiveTo; history keeps its price)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `dto: RetireRateCardDto` — [`RetireRateCardDto`](../request-response-dto-catalog.md#retire-rate-card-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRateCardAdminService.retireCorporateCard` at `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:58`; implementation: `apps/api/src/domains/corporate/billing/corporate-rate-card-admin.service.ts:127`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRateCard.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`RetireRateCardDto`](../request-response-dto-catalog.md#retire-rate-card-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:54` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-rate-card-admin.service.ts:127` — directly invoked service method.

## POST `/corporate/billing/rate-cards/driver`

**Handler:** `CorporateRateCardController.createDriverCard` — `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:61`

**Purpose:** Create a new driver rate card version (cannot start in the past)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Body` `dto: CreateDriverRateCardDto` — [`CreateDriverRateCardDto`](../request-response-dto-catalog.md#create-driver-rate-card-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRateCardAdminService.createDriverCard` at `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:65`; implementation: `apps/api/src/domains/corporate/billing/corporate-rate-card-admin.service.ts:138`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateDriverRateCard.findFirst`, `corporateDriverRateCard.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateDriverRateCardDto`](../request-response-dto-catalog.md#create-driver-rate-card-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:61` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-rate-card-admin.service.ts:138` — directly invoked service method.

## GET `/corporate/billing/rate-cards/driver`

**Handler:** `CorporateRateCardController.listDriverCards` — `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:68`

**Purpose:** List driver rate card versions (ADMIN only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Query(vehicleCategory)` `vehicleCategory: string` — `string`
- `@Query(at)` `at: string` — `string`
- `@Query(includeRetired)` `includeRetired: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRateCardAdminService.listDriverCards` at `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:76`; implementation: `apps/api/src/domains/corporate/billing/corporate-rate-card-admin.service.ts:186`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:68` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-rate-card-admin.service.ts:186` — directly invoked service method.

## POST `/corporate/billing/rate-cards/driver/:id/retire`

**Handler:** `CorporateRateCardController.retireDriverCard` — `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:79`

**Purpose:** Retire a driver rate card version

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `dto: RetireRateCardDto` — [`RetireRateCardDto`](../request-response-dto-catalog.md#retire-rate-card-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateRateCardAdminService.retireDriverCard` at `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:83`; implementation: `apps/api/src/domains/corporate/billing/corporate-rate-card-admin.service.ts:203`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateDriverRateCard.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`RetireRateCardDto`](../request-response-dto-catalog.md#retire-rate-card-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-rate-card.controller.ts:79` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-rate-card-admin.service.ts:203` — directly invoked service method.
