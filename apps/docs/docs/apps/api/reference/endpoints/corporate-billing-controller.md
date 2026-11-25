---
title: CorporateBillingController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateBillingController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateBillingController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-BILLING`  
**Controller source:** `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:42`  
**Nest route prefix:** `corporate/billing`  
**Swagger tags:** `Corporate ETS - Dual Financial Ledgers, Invoicing & Payouts`  
**Route methods:** 18; **decorated path variants:** 18

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/corporate/billing/invoices/generate-batch`

**Handler:** `CorporateBillingController.generateInvoiceBatch` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:53`

**Purpose:** Generate consolidated B2B GST tax invoice batch for corporate client (5% or 18% GST, integer paise)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Body` `dto: GenerateInvoiceBatchDto` — [`GenerateInvoiceBatchDto`](../request-response-dto-catalog.md#generate-invoice-batch-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `201` — Invoice generated

**Controller → service:**
- Calls `CorporateBillingService.generateInvoiceBatch` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:67`; implementation: `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:53`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.findUnique`, `corporateRoute.findMany`, `corporateInvoiceLine.findMany`, `corporateInvoice.create`, `corporateInvoiceLine.createMany`, `corporateInvoiceLine.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`GenerateInvoiceBatchDto`](../request-response-dto-catalog.md#generate-invoice-batch-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:53` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:53` — directly invoked service method.

## GET `/corporate/billing/invoices`

**Handler:** `CorporateBillingController.listInvoices` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:70`

**Purpose:** List corporate invoices with pagination and status filters

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`, `CorporatePermission('invoices:read')`.

**Request inputs:**
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(status)` `status: CorporateInvoiceStatus` — `CorporateInvoiceStatus`
- `@Query(page)` `page: string` — `string`
- `@Query(limit)` `limit: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- status `200` — List of invoices

**Controller → service:**
- Calls `CorporateBillingService.listInvoices` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:85`; implementation: `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:269`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateInvoice.count`, `corporateInvoice.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `CorporateInvoiceStatus`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:70` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:269` — directly invoked service method.

## GET `/corporate/billing/invoices/:id`

**Handler:** `CorporateBillingController.getInvoiceById` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:93`

**Purpose:** Get full invoice breakdown with individual route line items

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('invoice', 'id')`, `CorporatePermission('invoices:read')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Invoice details

**Controller → service:**
- Calls `CorporateBillingService.getInvoiceById` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:100`; implementation: `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:314`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateInvoice.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:93` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:314` — directly invoked service method.

## GET `/corporate/billing/invoices/:id/pdf`

**Handler:** `CorporateBillingController.downloadInvoicePdf` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:103`

**Purpose:** Download B2B GST tax invoice PDF document complying with Sec 31 CGST Act

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('invoice', 'id')`, `CorporatePermission('invoices:read')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Res` `res: Response`

**Success response declaration:**
- status `200` — Binary PDF tax invoice stream

**Controller → service:**
- Calls `CorporateBillingService.generateInvoicePdf` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:113`; implementation: `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:362`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateInvoice.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:103` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:362` — directly invoked service method.

## POST `/corporate/billing/payouts/prepare-batch`

**Handler:** `CorporateBillingController.preparePayoutBatch` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:122`

**Purpose:** RETIRED (410 Gone). Use POST payouts/batches -> /approve (different admin) -> /submit.

**Lifecycle:** Marked deprecated in the Swagger operation decorator.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- status `410` — Endpoint retired; use payouts/batches

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `GoneException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:122` — route decorator and handler.

## GET `/corporate/billing/payouts/preview`

**Handler:** `CorporateBillingController.previewPayoutBatch` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:146`

**Purpose:** Read-only preview of unpaid earnings per driver with 1% TDS (writes nothing)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Query(driverIds)` `driverIds: string` — `string`
- `@Query(cutoffDate)` `cutoffDate: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateBillingService.previewDriverPayoutBatch` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:150`; implementation: `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:529`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateDriverEarning.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:146` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:529` — directly invoked service method.

## GET `/corporate/billing/drivers/:driverId/earnings`

**Handler:** `CorporateBillingController.getDriverEarningsSummary` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:156`

**Purpose:** Get driver corporate commute earnings summary with TDS breakdown

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('driver', 'driverId')`.

**Request inputs:**
- `@Param(driverId)` `driverId: string`

**Success response declaration:**
- status `200` — Driver earnings summary

**Controller → service:**
- Calls `CorporateBillingService.getDriverEarningsSummary` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:162`; implementation: `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:629`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateDriverEarning.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:156` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:629` — directly invoked service method.

## POST `/corporate/billing/invoices/:id/disputes`

**Handler:** `CorporateBillingController.raiseDispute` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:169`

**Purpose:** Dispute an issued invoice (corporate roles: own tenant invoices only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('invoice', 'id')`, `CorporatePermission('billing:write')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `dto: RaiseInvoiceDisputeDto` — [`RaiseInvoiceDisputeDto`](../request-response-dto-catalog.md#raise-invoice-dispute-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `201` — Dispute opened

**Controller → service:**
- Calls `CorporateInvoiceDisputeService.raiseDispute` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:176`; implementation: `apps/api/src/domains/corporate/billing/corporate-invoice-dispute.service.ts:32`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateInvoice.findUnique`, `corporateInvoiceLine.findUnique`, `corporateInvoiceDispute.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`RaiseInvoiceDisputeDto`](../request-response-dto-catalog.md#raise-invoice-dispute-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:169` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-invoice-dispute.service.ts:32` — directly invoked service method.

## GET `/corporate/billing/disputes`

**Handler:** `CorporateBillingController.listDisputes` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:179`

**Purpose:** List invoice disputes (tenant-scoped)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`, `CorporatePermission('invoices:read')`.

**Request inputs:**
- `@Req` `req: any`
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(status)` `status: string` — `string`
- `@Query(invoiceId)` `invoiceId: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateInvoiceDisputeService.listDisputes` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:190`; implementation: `apps/api/src/domains/corporate/billing/corporate-invoice-dispute.service.ts:78`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateInvoiceDispute.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:179` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-invoice-dispute.service.ts:78` — directly invoked service method.

## POST `/corporate/billing/disputes/:id/accept`

**Handler:** `CorporateBillingController.acceptDispute` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:193`

**Purpose:** Accept a dispute and issue an immutable credit note (ADMIN)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `dto: ResolveInvoiceDisputeDto` — [`ResolveInvoiceDisputeDto`](../request-response-dto-catalog.md#resolve-invoice-dispute-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateInvoiceDisputeService.acceptDispute` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:197`; implementation: `apps/api/src/domains/corporate/billing/corporate-invoice-dispute.service.ts:93`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateInvoiceDispute.findUnique`, `corporateInvoice.findUnique`, `corporateInvoiceDispute.updateMany`, `corporateCreditNote.count`, `corporateCreditNote.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ResolveInvoiceDisputeDto`](../request-response-dto-catalog.md#resolve-invoice-dispute-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ConflictException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:193` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-invoice-dispute.service.ts:93` — directly invoked service method.

## POST `/corporate/billing/disputes/:id/reject`

**Handler:** `CorporateBillingController.rejectDispute` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:200`

**Purpose:** Reject a dispute with a reason (ADMIN)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `dto: ResolveInvoiceDisputeDto` — [`ResolveInvoiceDisputeDto`](../request-response-dto-catalog.md#resolve-invoice-dispute-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateInvoiceDisputeService.rejectDispute` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:204`; implementation: `apps/api/src/domains/corporate/billing/corporate-invoice-dispute.service.ts:165`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateInvoiceDispute.findUnique`, `corporateInvoiceDispute.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ResolveInvoiceDisputeDto`](../request-response-dto-catalog.md#resolve-invoice-dispute-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:200` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-invoice-dispute.service.ts:165` — directly invoked service method.

## GET `/corporate/billing/credit-notes`

**Handler:** `CorporateBillingController.listCreditNotes` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:207`

**Purpose:** List credit notes (tenant-scoped)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`, `CorporatePermission('invoices:read')`.

**Request inputs:**
- `@Req` `req: any`
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(invoiceId)` `invoiceId: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateInvoiceDisputeService.listCreditNotes` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:217`; implementation: `apps/api/src/domains/corporate/billing/corporate-invoice-dispute.service.ts:188`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateCreditNote.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:207` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-invoice-dispute.service.ts:188` — directly invoked service method.

## POST `/corporate/billing/payouts/batches`

**Handler:** `CorporateBillingController.createPayoutBatch` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:224`

**Purpose:** Create a payout batch from UNPAID earnings (maker step); one payout row per driver

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Body` `dto: CreatePayoutBatchRequestDto` — [`CreatePayoutBatchRequestDto`](../request-response-dto-catalog.md#create-payout-batch-request-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `201` — Batch created, awaiting checker approval

**Controller → service:**
- Calls `CorporateBillingService.createPayoutBatch` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:233`; implementation: `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:741`.
- Calls `CorporatePayoutService.getBatch` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:238`; implementation: `apps/api/src/domains/corporate/billing/corporate-payout.service.ts:420`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporatePayoutBatch.findUnique`, `corporateDriverEarning.findMany`, `corporatePayoutBatch.create`, `corporateDriverEarning.updateMany`, `corporatePayout.createMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreatePayoutBatchRequestDto`](../request-response-dto-catalog.md#create-payout-batch-request-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:224` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:741` — directly invoked service method.
- `apps/api/src/domains/corporate/billing/corporate-payout.service.ts:420` — directly invoked service method.

## GET `/corporate/billing/payouts/batches`

**Handler:** `CorporateBillingController.listPayoutBatches` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:241`

**Purpose:** List payout batches with per-status payout counts

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Query(status)` `status: string` — `string`
- `@Query(page)` `page: string` — `string`
- `@Query(limit)` `limit: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateBillingService.listPayoutBatches` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:249`; implementation: `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:966`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporatePayoutBatch.count`, `corporatePayoutBatch.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:241` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:966` — directly invoked service method.

## GET `/corporate/billing/payouts/batches/:id`

**Handler:** `CorporateBillingController.getPayoutBatch` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:256`

**Purpose:** Payout batch with its per-driver payouts

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(id)` `id: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporatePayoutService.getBatch` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:260`; implementation: `apps/api/src/domains/corporate/billing/corporate-payout.service.ts:420`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporatePayoutBatch.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:256` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-payout.service.ts:420` — directly invoked service method.

## POST `/corporate/billing/payouts/batches/:id/approve`

**Handler:** `CorporateBillingController.approvePayoutBatch` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:263`

**Purpose:** Approve a payout batch (checker must differ from maker, else 403)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Req` `req: any`

**Success response declaration:**
- status `403` — Maker-checker violation

**Controller → service:**
- Calls `CorporateBillingService.approvePayoutBatch` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:268`; implementation: `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:880`.
- Calls `CorporatePayoutService.getBatch` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:269`; implementation: `apps/api/src/domains/corporate/billing/corporate-payout.service.ts:420`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporatePayoutBatch.findUnique`, `corporatePayoutBatch.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`, `ForbiddenException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:263` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-billing.service.ts:880` — directly invoked service method.
- `apps/api/src/domains/corporate/billing/corporate-payout.service.ts:420` — directly invoked service method.

## POST `/corporate/billing/payouts/batches/:id/submit`

**Handler:** `CorporateBillingController.submitPayoutBatch` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:272`

**Purpose:** Send an APPROVED batch to the payout provider (or retry its FAILED payouts with the same idempotency keys). Never marks PAID.

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporatePayoutService.submitBatch` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:279`; implementation: `apps/api/src/domains/corporate/billing/corporate-payout.service.ts:80`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporatePayoutBatch.findUnique`, `corporatePayoutBatch.updateMany`, `corporatePayout.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:272` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-payout.service.ts:80` — directly invoked service method.

## GET `/corporate/billing/reconciliations`

**Handler:** `CorporateBillingController.getReconciliation` — `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:282`

**Purpose:** Payout reconciliation: payouts whose status differs from the provider, and unmatched confirmations

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Query(from)` `from: string` — `string`
- `@Query(to)` `to: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporatePayoutService.getReconciliation` at `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:288`; implementation: `apps/api/src/domains/corporate/billing/corporate-payout.service.ts:483`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporatePayoutProviderEvent.findMany`, `corporatePayout.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-billing.controller.ts:282` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-payout.service.ts:483` — directly invoked service method.
