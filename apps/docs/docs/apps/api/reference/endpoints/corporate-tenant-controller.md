---
title: CorporateTenantController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporateTenantController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporateTenantController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-TENANT`  
**Controller source:** `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:56`  
**Nest route prefix:** `corporate/tenants`  
**Swagger tags:** `Corporate ETS - Tenants, Offices & Employees`  
**Route methods:** 34; **decorated path variants:** 34

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/corporate/tenants/onboard`

**Handler:** `CorporateTenantController.onboardCompany` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:75`

**Purpose:** Atomically onboard a corporate client (tenant, primary office, operational policy, optional shift, and Corporate Portal admin)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Body` `dto: OnboardCorporateCompanyDto` — [`OnboardCorporateCompanyDto`](../request-response-dto-catalog.md#onboard-corporate-company-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `201` — Company onboarded with Corporate Portal credentials

**Controller → service:**
- Calls `CorporateOnboardingService.onboardCompany` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:82`; implementation: `apps/api/src/domains/corporate/tenants/corporate-onboarding.service.ts:50`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.findUnique`, `user.findFirst`, `corporateTenant.create`, `corporateOffice.create`, `corporateTenantPolicy.create`, `corporateShiftTemplate.create`, `user.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`OnboardCorporateCompanyDto`](../request-response-dto-catalog.md#onboard-corporate-company-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:75` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-onboarding.service.ts:50` — directly invoked service method.

## POST `/corporate/tenants`

**Handler:** `CorporateTenantController.createTenant` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:85`

**Purpose:** Onboard a new corporate tenant

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Body` `dto: CreateCorporateTenantDto` — [`CreateCorporateTenantDto`](../request-response-dto-catalog.md#create-corporate-tenant-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `201` — Tenant successfully onboarded

**Controller → service:**
- Calls `CorporateTenantService.createTenant` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:90`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:51`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.findUnique`, `corporateTenant.create`, `corporateTenantPolicy.create`, `user.findFirst`, `user.create`, `user.update`, `corporateOffice.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateCorporateTenantDto`](../request-response-dto-catalog.md#create-corporate-tenant-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:85` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:51` — directly invoked service method.

## GET `/corporate/tenants`

**Handler:** `CorporateTenantController.listTenants` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:93`

**Purpose:** List all corporate tenants

**Actor/access declaration:** Declared roles: `UserRole.ADMIN, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Request inputs:**
- `@Query(search)` `search: string` — `string`
- `@Query(status)` `status: CorporateTenantStatus` — `CorporateTenantStatus`
- `@Query(page)` `page: string` — `string`
- `@Query(limit)` `limit: string` — `string`
- `@Query(minimal)` `minimal: string` — `string`

**Success response declaration:**
- status `200` — Paginated list of corporate tenants

**Controller → service:**
- Calls `CorporateTenantService.listTenants` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:104`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:292`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.count`, `corporateTenant.findMany`, `corporateRoute.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `CorporateTenantStatus`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:93` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:292` — directly invoked service method.

## GET `/corporate/tenants/:id`

**Handler:** `CorporateTenantController.getTenantById` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:113`

**Purpose:** Get corporate tenant profile with offices and metrics

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('tenant:read')`.

**Request inputs:**
- `@Param(id)` `id: string`

**Success response declaration:**
- status `200` — Tenant details

**Controller → service:**
- Calls `CorporateTenantService.getTenantById` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:120`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:467`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:113` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:467` — directly invoked service method.

## PATCH `/corporate/tenants/:id`

**Handler:** `CorporateTenantController.updateTenant` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:123`

**Purpose:** Update corporate tenant information or active status

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `dto: UpdateCorporateTenantDto` — [`UpdateCorporateTenantDto`](../request-response-dto-catalog.md#update-corporate-tenant-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Tenant updated successfully

**Controller → service:**
- Calls `CorporateTenantService.updateTenant` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:133`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:514`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateCorporateTenantDto`](../request-response-dto-catalog.md#update-corporate-tenant-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:123` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:514` — directly invoked service method.

## POST `/corporate/tenants/:id/logo`

**Handler:** `CorporateTenantController.uploadTenantLogo` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:136`

**Purpose:** Upload a sanitized company logo (JPEG, PNG or WebP; maximum 2 MB)

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('tenant:write')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `StorageService.saveFile` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:153`; implementation: `apps/api/src/common/storage/storage.service.ts:146`.
- Calls `CorporateTenantService.updateTenant` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:157`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:514`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:136` — route decorator and handler.
- `apps/api/src/common/storage/storage.service.ts:146` — directly invoked service method.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:514` — directly invoked service method.

## PATCH `/corporate/tenants/:id/profile`

**Handler:** `CorporateTenantController.updateTenantProfile` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:161`

**Purpose:** Update the current corporate tenant profile

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('tenant:write')`.

**Request inputs:**
- `@Param(id)` `id: string`
- `@Body` `dto: UpdateCorporateTenantProfileDto` — [`UpdateCorporateTenantProfileDto`](../request-response-dto-catalog.md#update-corporate-tenant-profile-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Corporate profile updated successfully

**Controller → service:**
- Calls `CorporateTenantService.updateTenantProfile` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:172`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:546`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateCorporateTenantProfileDto`](../request-response-dto-catalog.md#update-corporate-tenant-profile-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `Error`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:161` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:546` — directly invoked service method.

## GET `/corporate/tenants/:id/users`

**Handler:** `CorporateTenantController.listUsers` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:179`

**Purpose:** List corporate portal users of a tenant with their role and office scope

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('users:read')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTenantUsersService.listUsers` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:185`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant-users.service.ts:82`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:179` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant-users.service.ts:82` — directly invoked service method.

## POST `/corporate/tenants/:id/users`

**Handler:** `CorporateTenantController.inviteUser` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:188`

**Purpose:** Invite a corporate user (CORP_SUPER_ADMIN, HR, TRANSPORT, FINANCE, SAFETY, READ_ONLY) with an office scope

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('users:invite')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Body` `body: InviteCorporateUserInput` — [`InviteCorporateUserInput`](../request-response-dto-catalog.md#invite-corporate-user-input)
- `@Req` `req: any`

**Success response declaration:**
- status `201` — User invited

**Controller → service:**
- Calls `CorporateTenantUsersService.inviteUser` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:198`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant-users.service.ts:90`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findFirst`, `user.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`InviteCorporateUserInput`](../request-response-dto-catalog.md#invite-corporate-user-input). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:188` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant-users.service.ts:90` — directly invoked service method.

## PATCH `/corporate/tenants/:id/users/:userId`

**Handler:** `CorporateTenantController.updateUser` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:201`

**Purpose:** Change the corporate role / office scope of a tenant user (effective on next token refresh)

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('users:invite')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Param(userId)` `userId: string`
- `@Body` `body: UpdateCorporateUserInput` — [`UpdateCorporateUserInput`](../request-response-dto-catalog.md#update-corporate-user-input)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTenantUsersService.updateUser` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:212`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant-users.service.ts:154`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findFirst`, `user.count`, `user.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateCorporateUserInput`](../request-response-dto-catalog.md#update-corporate-user-input). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`, `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:201` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant-users.service.ts:154` — directly invoked service method.

## GET `/corporate/tenants/:id/departments`

**Handler:** `CorporateTenantController.listDepartments` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:219`

**Purpose:** List departments of a tenant

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('departments:read')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Query(includeInactive)` `includeInactive: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateOrgStructureService.list` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:229`; implementation: `apps/api/src/domains/corporate/tenants/corporate-org-structure.service.ts:116`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:219` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-org-structure.service.ts:116` — directly invoked service method.

## POST `/corporate/tenants/:id/departments`

**Handler:** `CorporateTenantController.createDepartment` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:232`

**Purpose:** Create a department (code unique per tenant); links employees whose department text matches

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('departments:write')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Body` `body: CreateOrgUnitInput` — [`CreateOrgUnitInput`](../request-response-dto-catalog.md#create-org-unit-input)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateOrgStructureService.create` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:241`; implementation: `apps/api/src/domains/corporate/tenants/corporate-org-structure.service.ts:47`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.findUnique`, `corporateOffice.findFirst`, `corporateEmployee.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateOrgUnitInput`](../request-response-dto-catalog.md#create-org-unit-input). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`, `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:232` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-org-structure.service.ts:47` — directly invoked service method.

## PATCH `/corporate/tenants/:id/departments/:departmentId`

**Handler:** `CorporateTenantController.updateDepartment` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:244`

**Purpose:** Update or deactivate a tenant department

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('departments:write')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Param(departmentId)` `departmentId: string`
- `@Body` `body: Partial<CreateOrgUnitInput>` — [`Partial<CreateOrgUnitInput>`](../request-response-dto-catalog.md#create-org-unit-input)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateOrgStructureService.updateDepartment` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:258`; implementation: `apps/api/src/domains/corporate/tenants/corporate-org-structure.service.ts:133`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateDepartment.findFirst`, `corporateOffice.findFirst`, `corporateDepartment.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`Partial<CreateOrgUnitInput>`](../request-response-dto-catalog.md#create-org-unit-input). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`, `NotFoundException`, `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:244` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-org-structure.service.ts:133` — directly invoked service method.

## GET `/corporate/tenants/:id/transport-zones`

**Handler:** `CorporateTenantController.listTransportZones` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:261`

**Purpose:** List transport zones for this tenant

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('zones:read')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Query(includeInactive)` `includeInactive: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTransportZoneService.list` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:271`; implementation: `apps/api/src/domains/corporate/tenants/corporate-transport-zone.service.ts:15`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTransportZone.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:261` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-transport-zone.service.ts:15` — directly invoked service method.

## POST `/corporate/tenants/:id/transport-zones`

**Handler:** `CorporateTenantController.createTransportZone` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:274`

**Purpose:** Create a tenant-scoped transport zone

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('zones:write')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Body` `body: CreateCorporateTransportZoneDto` — [`CreateCorporateTransportZoneDto`](../request-response-dto-catalog.md#create-corporate-transport-zone-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTransportZoneService.create` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:287`; implementation: `apps/api/src/domains/corporate/tenants/corporate-transport-zone.service.ts:27`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTransportZone.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateCorporateTransportZoneDto`](../request-response-dto-catalog.md#create-corporate-transport-zone-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:274` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-transport-zone.service.ts:27` — directly invoked service method.

## PATCH `/corporate/tenants/:id/transport-zones/:zoneId`

**Handler:** `CorporateTenantController.updateTransportZone` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:290`

**Purpose:** Update or deactivate a tenant-scoped transport zone

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('zones:write')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Param(zoneId)` `zoneId: string`
- `@Body` `body: UpdateCorporateTransportZoneDto` — [`UpdateCorporateTransportZoneDto`](../request-response-dto-catalog.md#update-corporate-transport-zone-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTransportZoneService.update` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:301`; implementation: `apps/api/src/domains/corporate/tenants/corporate-transport-zone.service.ts:49`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTransportZone.findFirst`, `corporateTransportZone.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateCorporateTransportZoneDto`](../request-response-dto-catalog.md#update-corporate-transport-zone-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:290` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-transport-zone.service.ts:49` — directly invoked service method.

## GET `/corporate/tenants/:id/cost-centers`

**Handler:** `CorporateTenantController.listCostCenters` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:304`

**Purpose:** List cost centers of a tenant

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('costcenters:read')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateOrgStructureService.list` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:310`; implementation: `apps/api/src/domains/corporate/tenants/corporate-org-structure.service.ts:116`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:304` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-org-structure.service.ts:116` — directly invoked service method.

## POST `/corporate/tenants/:id/cost-centers`

**Handler:** `CorporateTenantController.createCostCenter` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:313`

**Purpose:** Create a cost center (code unique per tenant); links employees whose cost center text matches

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('costcenters:write')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Body` `body: CreateOrgUnitInput` — [`CreateOrgUnitInput`](../request-response-dto-catalog.md#create-org-unit-input)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateOrgStructureService.create` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:319`; implementation: `apps/api/src/domains/corporate/tenants/corporate-org-structure.service.ts:47`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.findUnique`, `corporateOffice.findFirst`, `corporateEmployee.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateOrgUnitInput`](../request-response-dto-catalog.md#create-org-unit-input). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:313` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-org-structure.service.ts:47` — directly invoked service method.

## GET `/corporate/tenants/:id/policy`

**Handler:** `CorporateTenantController.getPolicy` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:326`

**Purpose:** Effective tenant policy (cancel cutoff, max ride, vehicle, capacity, escalation lead) at ?at (default now)

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('policy:read')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Query(at)` `at: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTenantPolicyService.getEffectivePolicy` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:334`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant-policy.service.ts:80`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenantPolicy.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:326` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant-policy.service.ts:80` — directly invoked service method.

## GET `/corporate/tenants/:id/policy/versions`

**Handler:** `CorporateTenantController.listPolicyVersions` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:337`

**Purpose:** All policy versions of a tenant, newest first

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('policy:read')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTenantPolicyService.listPolicyVersions` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:343`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant-policy.service.ts:131`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenantPolicy.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:337` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant-policy.service.ts:131` — directly invoked service method.

## POST `/corporate/tenants/:id/policy`

**Handler:** `CorporateTenantController.createPolicyVersion` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:346`

**Purpose:** Add a tenant policy version effective from effectiveFrom (default now); omitted fields inherit

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('policy:write')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Body` `body: CreateTenantPolicyInput` — [`CreateTenantPolicyInput`](../request-response-dto-catalog.md#create-tenant-policy-input)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTenantPolicyService.createPolicyVersion` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:352`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant-policy.service.ts:140`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTenant.findUnique`, `corporateTenantPolicy.findFirst`, `corporateTenantPolicy.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateTenantPolicyInput`](../request-response-dto-catalog.md#create-tenant-policy-input). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:346` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant-policy.service.ts:140` — directly invoked service method.

## POST `/corporate/tenants/:id/offices`

**Handler:** `CorporateTenantController.createOffice` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:359`

**Purpose:** Create an office campus for a corporate tenant

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('offices:write')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Body` `dto: CreateCorporateOfficeDto` — [`CreateCorporateOfficeDto`](../request-response-dto-catalog.md#create-corporate-office-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `201` — Office campus created

**Controller → service:**
- Calls `CorporateTenantService.createOffice` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:374`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:635`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateOffice.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateCorporateOfficeDto`](../request-response-dto-catalog.md#create-corporate-office-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:359` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:635` — directly invoked service method.

## GET `/corporate/tenants/:id/offices`

**Handler:** `CorporateTenantController.listOffices` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:377`

**Purpose:** List all office campuses for a corporate tenant (office-scoped users: their offices)

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('offices:read')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Query(includeInactive)` `includeInactive: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- status `200` — List of offices

**Controller → service:**
- Calls `CorporateTenantService.listOffices` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:388`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:686`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateOffice.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:377` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:686` — directly invoked service method.

## GET `/corporate/tenants/:id/offices/:officeId`

**Handler:** `CorporateTenantController.getOfficeById` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:391`

**Purpose:** Get office campus details

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('offices:read')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Param(officeId)` `officeId: string`

**Success response declaration:**
- status `200` — Office details

**Controller → service:**
- Calls `CorporateTenantService.getOfficeById` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:401`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:798`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateOffice.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:391` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:798` — directly invoked service method.

## PATCH `/corporate/tenants/:id/offices/:officeId`

**Handler:** `CorporateTenantController.updateOffice` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:404`

**Purpose:** Update or deactivate an office while preserving historical references

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('offices:write')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Param(officeId)` `officeId: string`
- `@Body` `dto: UpdateCorporateOfficeDto` — [`UpdateCorporateOfficeDto`](../request-response-dto-catalog.md#update-corporate-office-dto)
- `@Req` `req: any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `CorporateTenantService.updateOffice` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:418`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:707`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRoute.findFirst`, `corporateRoster.findFirst`, `corporateOffice.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateCorporateOfficeDto`](../request-response-dto-catalog.md#update-corporate-office-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:404` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:707` — directly invoked service method.

## GET `/corporate/tenants/:id/offices/:officeId/geofences`

**Handler:** `CorporateTenantController.getOfficeGeofences` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:421`

**Purpose:** Get office geofence polygon, gates and pickup bays

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('offices:read')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Param(officeId)` `officeId: string`

**Success response declaration:**
- status `200` — Office geofences and gates

**Controller → service:**
- Calls `CorporateTenantService.getOfficeGeofences` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:431`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1554`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:421` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1554` — directly invoked service method.

## GET `/corporate/tenants/:id/integrations`

**Handler:** `CorporateTenantController.getIntegrations` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:434`

**Purpose:** Get tenant HRMS connector status, webhook delivery health and field mappings

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('tenant:read')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`

**Success response declaration:**
- status `200` — Integration status

**Controller → service:**
- Calls `CorporateTenantService.getTenantIntegrations` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:441`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1570`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:434` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1570` — directly invoked service method.

## POST `/corporate/tenants/:id/employees`

**Handler:** `CorporateTenantController.createEmployee` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:448`

**Purpose:** Add an employee with address geocoding, H3 spatial cell mapping, and login account provisioning

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('employees:write')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Body` `dto: CreateCorporateEmployeeDto` — [`CreateCorporateEmployeeDto`](../request-response-dto-catalog.md#create-corporate-employee-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `201` — Employee registered

**Controller → service:**
- Calls `CorporateTenantService.createEmployee` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:459`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:820`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateOffice.findFirst`, `corporateEmployee.findFirst`, `corporateEmployee.create`, `corporateEmployeeLocation.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateCorporateEmployeeDto`](../request-response-dto-catalog.md#create-corporate-employee-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:448` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:820` — directly invoked service method.

## GET `/corporate/tenants/:id/employees`

**Handler:** `CorporateTenantController.listEmployees` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:462`

**Purpose:** List corporate employees with search and filters (office-scoped users: their offices)

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('employees:read')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Query(search)` `search: string` — `string`
- `@Query(officeId)` `officeId: string` — `string`
- `@Query(department)` `department: string` — `string`
- `@Query(isActive)` `isActive: string` — `string`
- `@Query(page)` `page: string` — `string`
- `@Query(limit)` `limit: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Paginated list of employees

**Controller → service:**
- Calls `CorporateTenantService.listEmployees` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:478`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:978`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateEmployee.count`, `corporateEmployee.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:462` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:978` — directly invoked service method.

## GET `/corporate/tenants/:id/employees/:employeeId`

**Handler:** `CorporateTenantController.getEmployeeById` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:489`

**Purpose:** Get employee details and pickup locations

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('employees:read')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Param(employeeId)` `employeeId: string`
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Employee details

**Controller → service:**
- Calls `CorporateTenantService.getEmployeeById` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:500`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1042`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateEmployee.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:489` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1042` — directly invoked service method.

## GET `/corporate/tenants/:id/employees/:employeeId/requests`

**Handler:** `CorporateTenantController.listEmployeeRequests` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:503`

**Purpose:** Commute history of an employee: transport requests (newest first) with planned vs actual pickup

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('employees:read')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Param(employeeId)` `employeeId: string`
- `@Query(limit)` `limit: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Employee transport requests

**Controller → service:**
- Calls `CorporateTenantService.listEmployeeRequests` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:517`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1068`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateTransportRequest.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:503` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1068` — directly invoked service method.

## PATCH `/corporate/tenants/:id/employees/:employeeId`

**Handler:** `CorporateTenantController.updateEmployee` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:522`

**Purpose:** Update employee details, home address, or active status (syncs linked login account)

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('employees:write')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Param(employeeId)` `employeeId: string`
- `@Body` `dto: UpdateCorporateEmployeeDto` — [`UpdateCorporateEmployeeDto`](../request-response-dto-catalog.md#update-corporate-employee-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Employee updated successfully

**Controller → service:**
- Calls `CorporateTenantService.updateEmployee` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:534`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1109`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateOffice.findFirst`, `user.findFirst`, `corporateEmployeeLocation.updateMany`, `corporateEmployeeLocation.create`, `corporateEmployee.update`, `user.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateCorporateEmployeeDto`](../request-response-dto-catalog.md#update-corporate-employee-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:522` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1109` — directly invoked service method.

## DELETE `/corporate/tenants/:id/employees/:employeeId`

**Handler:** `CorporateTenantController.deleteEmployee` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:537`

**Purpose:** Delete an employee (or soft-deactivate if historical trips/tickets exist)

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('employees:write')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Param(employeeId)` `employeeId: string`
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Employee deleted or deactivated

**Controller → service:**
- Calls `CorporateTenantService.deleteEmployee` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:548`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1246`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateRouteStop.count`, `corporateSupportTicket.count`, `corporateTransportRequest.count`, `corporateEmployee.update`, `corporateRouteStop.findMany`, `corporateRouteStop.updateMany`, `corporateRoute.update`, `corporateTransportRequest.updateMany`, `user.update`, `corporateRouteStop.deleteMany`, `corporateTransportRequest.deleteMany`, `corporateEmployeeLocation.deleteMany`, `corporateEmployee.delete`, `corporateRouteStop.update`, `user.findUnique`, `user.delete`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:537` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1246` — directly invoked service method.

## POST `/corporate/tenants/:id/employees/:employeeId/locations`

**Handler:** `CorporateTenantController.addEmployeeLocation` — `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:551`

**Purpose:** Add an alternate or default pickup/drop location for employee

**Actor/access declaration:** Declared roles: `...CORPORATE_PORTAL_ROLES, UserRole.OPS`

**Guards:** `JwtAuthGuard, RolesGuard, CorporateAccessGuard`.

**Corporate/resource scope declarations:** `CorporateResource('tenant', 'id')`, `CorporatePermission('employees:write')`.

**Request inputs:**
- `@Param(id)` `tenantId: string`
- `@Param(employeeId)` `employeeId: string`
- `@Body` `dto: CreateEmployeeLocationDto` — [`CreateEmployeeLocationDto`](../request-response-dto-catalog.md#create-employee-location-dto)
- `@Req` `req: any`

**Success response declaration:**
- status `201` — Location saved

**Controller → service:**
- Calls `CorporateTenantService.addEmployeeLocation` at `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:563`; implementation: `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1482`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateEmployeeLocation.updateMany`, `corporateEmployeeLocation.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateEmployeeLocationDto`](../request-response-dto-catalog.md#create-employee-location-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/tenants/corporate-tenant.controller.ts:551` — route decorator and handler.
- `apps/api/src/domains/corporate/tenants/corporate-tenant.service.ts:1482` — directly invoked service method.
