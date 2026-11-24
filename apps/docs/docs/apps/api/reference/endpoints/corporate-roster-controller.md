---
title: CorporateRosterController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateRosterController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateRosterController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-ROSTER`  
**Controller source:** `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:34`  
**Nest route prefix:** `corporate/rosters`  
**Swagger tags:** `Corporate ETS - Rosters`  
**Route methods:** 8; **decorated path variants:** 8

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/corporate/rosters/template`

**Handler:** `CorporateRosterController.downloadTemplate` — `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:46`

**Purpose:** Download the official AdhocX Corporate Roster Excel template (.xlsx)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Res` `res: Response`

**Success response declaration:**
- status `200` — Excel template stream

**Controller → service:**
- Calls `RosterTemplateService.generateTemplateBuffer` at `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:51`; implementation: `apps/api/src/domains/corporate/rosters/roster-template.service.ts:9`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:46` — route decorator and handler.
- `apps/api/src/domains/corporate/rosters/roster-template.service.ts:9` — directly invoked service method.

## POST `/corporate/rosters/validate`

**Handler:** `CorporateRosterController.validateRoster` — `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:62`

**Purpose:** Dry-run validate an uploaded Excel roster file without persisting changes

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@UploadedFile` `file: Express.Multer.File`
- `@Body(tenantId)` `tenantIdFromBody: string` — `string`
- `@Query(tenantId)` `tenantIdFromQuery: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `RosterIngestionService.dryRunValidateRoster` at `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:93`; implementation: `apps/api/src/domains/corporate/rosters/roster-ingestion.service.ts:46`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.findUnique`, `corporateOffice.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:62` — route decorator and handler.
- `apps/api/src/domains/corporate/rosters/roster-ingestion.service.ts:46` — directly invoked service method.

## POST `/corporate/rosters/upload`

**Handler:** `CorporateRosterController.uploadRoster` — `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:96`

**Purpose:** Upload, validate, and ingest corporate roster; generates transport requests

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@UploadedFile` `file: Express.Multer.File`
- `@Body(tenantId)` `tenantIdFromBody: string` — `string`
- `@Query(tenantId)` `tenantIdFromQuery: string` — `string`
- `@Body(uploadedByUserId)` `uploadedByUserId: string` — `string`
- `@Req` `req: any`
- `@Body(mode)` `modeFromBody: string` — `string`
- `@Query(mode)` `modeFromQuery: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `RosterIngestionService.ingestDraftRoster` at `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:145`; implementation: `apps/api/src/domains/corporate/rosters/roster-ingestion.service.ts:358`.
- Calls `RosterIngestionService.ingestAndPublishRoster` at `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:147`; implementation: `apps/api/src/domains/corporate/rosters/roster-ingestion.service.ts:237`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateOffice.findMany`, `corporateShiftTemplate.findMany`, `corporateRoster.findFirst`, `corporateRoster.create`, `corporateRosterEntry.createMany`, `corporateTransportRequest.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:96` — route decorator and handler.
- `apps/api/src/domains/corporate/rosters/roster-ingestion.service.ts:358` — directly invoked service method.
- `apps/api/src/domains/corporate/rosters/roster-ingestion.service.ts:237` — directly invoked service method.

## GET `/corporate/rosters`

**Handler:** `CorporateRosterController.listRosters` — `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:150`

**Purpose:** List corporate rosters for a tenant (office-scoped users: their offices)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateTenantScoped()`.

**Request inputs:**
- `@Query(tenantId)` `tenantId: string` — `string`
- `@Query(rosterDate)` `rosterDate: string` — `string`
- `@Query(officeId)` `officeId: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:150` — route decorator and handler.

## GET `/corporate/rosters/:id`

**Handler:** `CorporateRosterController.getRosterById` — `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:195`

**Purpose:** Get details of a specific corporate roster

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('roster', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- No direct call through an injected constructor service was found in the handler body.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:195` — route decorator and handler.

## POST `/corporate/rosters/:id/approve`

**Handler:** `CorporateRosterController.approveRoster` — `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:245`

**Purpose:** Approve a DRAFT roster version (DRAFT -> APPROVED); idempotent; actor audited

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('roster', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `RosterLifecycleService.approve` at `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:250`; implementation: `apps/api/src/domains/corporate/rosters/roster-lifecycle.service.ts:54`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoster.updateMany`, `corporateRoster.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:245` — route decorator and handler.
- `apps/api/src/domains/corporate/rosters/roster-lifecycle.service.ts:54` — directly invoked service method.

## POST `/corporate/rosters/:id/publish`

**Handler:** `CorporateRosterController.publishRoster` — `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:253`

**Purpose:** Publish an APPROVED roster version (APPROVED -> PUBLISHED) and generate demand idempotently

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('roster', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `RosterLifecycleService.publish` at `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:261`; implementation: `apps/api/src/domains/corporate/rosters/roster-lifecycle.service.ts:87`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoster.updateMany`, `corporateRoster.findUnique`, `corporateRosterEntry.findMany`, `corporateTransportRequest.createMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:253` — route decorator and handler.
- `apps/api/src/domains/corporate/rosters/roster-lifecycle.service.ts:87` — directly invoked service method.

## GET `/corporate/rosters/:id/requests`

**Handler:** `CorporateRosterController.getRosterTransportRequests` — `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:264`

**Purpose:** Get all transport requests belonging to a corporate roster

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('roster', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Query(status)` `status: string` — `string`

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
- `apps/api/src/domains/corporate/rosters/corporate-roster.controller.ts:264` — route decorator and handler.
