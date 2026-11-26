---
title: AdminController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for AdminController.
status: partial
last_reviewed: "2026-11-23"
---

# AdminController Endpoint Reference

**Stable controller ID:** `API-CTRL-ADMIN`  
**Controller source:** `apps/api/src/modules/admin/admin.controller.ts:32`  
**Nest route prefix:** `admin`  
**Swagger tags:** `Admin Operations`  
**Route methods:** 39; **decorated path variants:** 39

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/admin/drivers`

**Handler:** `AdminController.listDrivers` — `apps/api/src/modules/admin/admin.controller.ts:42`

**Purpose:** List drivers for verification and operational review

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query` `query: AdminDriverQueryDto` — [`AdminDriverQueryDto`](../request-response-dto-catalog.md#admin-driver-query-dto)

**Success response declaration:**
- status `200` — Paginated list of drivers

**Controller → service:**
- Calls `AdminService.listDrivers` at `apps/api/src/modules/admin/admin.controller.ts:46`; implementation: `apps/api/src/modules/admin/admin.service.ts:76`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findMany`, `driver.count`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`AdminDriverQueryDto`](../request-response-dto-catalog.md#admin-driver-query-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:42` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:76` — directly invoked service method.

## GET `/admin/drivers/:id`

**Handler:** `AdminController.getDriverDetails` — `apps/api/src/modules/admin/admin.controller.ts:49`

**Purpose:** Get full driver details including vehicles and KYC documents

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — Driver details retrieved

**Controller → service:**
- Calls `AdminService.getDriverDetails` at `apps/api/src/modules/admin/admin.controller.ts:53`; implementation: `apps/api/src/modules/admin/admin.service.ts:191`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:49` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:191` — directly invoked service method.

## PATCH `/admin/drivers/:id`

**Handler:** `AdminController.updateDriver` — `apps/api/src/modules/admin/admin.controller.ts:56`

**Purpose:** Update driver profile details (admin override)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: { fullName?: string; phone?: string; vehiclePlate?: string; vehicleModel?: string; vehicleType?: string }` — `{ fullName?: string; phone?: string; vehiclePlate?: string; vehicleModel?: string; vehicleType?: string }`

**Success response declaration:**
- status `200` — Driver details updated

**Controller → service:**
- Calls `AdminService.updateDriver` at `apps/api/src/modules/admin/admin.controller.ts:64`; implementation: `apps/api/src/modules/admin/admin.service.ts:1573`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `vehiclePricingTier.findUnique`, `user.update`, `driver.update`, `vehicle.findFirst`, `vehicle.update`, `vehicle.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ fullName?: string; phone?: string; vehiclePlate?: string; vehicleModel?: string; vehicleType?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:56` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1573` — directly invoked service method.

## POST `/admin/drivers/:id/verify`

**Handler:** `AdminController.verifyDriver` — `apps/api/src/modules/admin/admin.controller.ts:67`

**Purpose:** Approve driver KYC (UNDER_REVIEW -> VERIFIED)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyDriverKycDto` — [`VerifyDriverKycDto`](../request-response-dto-catalog.md#verify-driver-kyc-dto)

**Success response declaration:**
- status `200` — Driver verified successfully

**Controller → service:**
- Calls `AdminService.verifyDriver` at `apps/api/src/modules/admin/admin.controller.ts:76`; implementation: `apps/api/src/modules/admin/admin.service.ts:251`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`, `driverReferral.findUnique`, `driverReferral.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VerifyDriverKycDto`](../request-response-dto-catalog.md#verify-driver-kyc-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:67` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:251` — directly invoked service method.

## POST `/admin/drivers/:id/reject`

**Handler:** `AdminController.rejectDriver` — `apps/api/src/modules/admin/admin.controller.ts:79`

**Purpose:** Reject driver KYC with mandatory reason (UNDER_REVIEW -> REJECTED)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: RejectDriverKycDto` — [`RejectDriverKycDto`](../request-response-dto-catalog.md#reject-driver-kyc-dto)

**Success response declaration:**
- status `200` — Driver rejected

**Controller → service:**
- Calls `AdminService.rejectDriver` at `apps/api/src/modules/admin/admin.controller.ts:88`; implementation: `apps/api/src/modules/admin/admin.service.ts:364`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`RejectDriverKycDto`](../request-response-dto-catalog.md#reject-driver-kyc-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:79` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:364` — directly invoked service method.

## POST `/admin/drivers/:id/suspend`

**Handler:** `AdminController.suspendDriver` — `apps/api/src/modules/admin/admin.controller.ts:91`

**Purpose:** Suspend verified driver (VERIFIED -> SUSPENDED)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: SuspendDriverDto` — [`SuspendDriverDto`](../request-response-dto-catalog.md#suspend-driver-dto)

**Success response declaration:**
- status `200` — Driver suspended

**Controller → service:**
- Calls `AdminService.suspendDriver` at `apps/api/src/modules/admin/admin.controller.ts:100`; implementation: `apps/api/src/modules/admin/admin.service.ts:418`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`SuspendDriverDto`](../request-response-dto-catalog.md#suspend-driver-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:91` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:418` — directly invoked service method.

## POST `/admin/drivers/:id/reactivate`

**Handler:** `AdminController.reactivateDriver` — `apps/api/src/modules/admin/admin.controller.ts:103`

**Purpose:** Reactivate suspended driver (SUSPENDED -> VERIFIED)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: ReactivateDriverDto` — [`ReactivateDriverDto`](../request-response-dto-catalog.md#reactivate-driver-dto)

**Success response declaration:**
- status `200` — Driver reactivated

**Controller → service:**
- Calls `AdminService.reactivateDriver` at `apps/api/src/modules/admin/admin.controller.ts:112`; implementation: `apps/api/src/modules/admin/admin.service.ts:476`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ReactivateDriverDto`](../request-response-dto-catalog.md#reactivate-driver-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:103` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:476` — directly invoked service method.

## POST `/admin/drivers/:id/clear-cooldown`

**Handler:** `AdminController.clearDriverCooldown` — `apps/api/src/modules/admin/admin.controller.ts:115`

**Purpose:** Lift an active dispatch cooldown and reset the decline streak

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — Cooldown cleared

**Controller → service:**
- Calls `AdminService.clearDriverCooldown` at `apps/api/src/modules/admin/admin.controller.ts:120`; implementation: `apps/api/src/modules/admin/admin.service.ts:568`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:115` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:568` — directly invoked service method.

## POST `/admin/vendors`

**Handler:** `AdminController.createVendor` — `apps/api/src/modules/admin/admin.controller.ts:125`

**Purpose:** Manually onboard and create a new vendor account

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: CreateVendorDto` — [`CreateVendorDto`](../request-response-dto-catalog.md#create-vendor-dto)

**Success response declaration:**
- status `201` — Vendor created successfully

**Controller → service:**
- Calls `AdminService.createVendor` at `apps/api/src/modules/admin/admin.controller.ts:133`; implementation: `apps/api/src/modules/admin/admin.service.ts:665`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findFirst`, `user.create`, `vendor.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateVendorDto`](../request-response-dto-catalog.md#create-vendor-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:125` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:665` — directly invoked service method.

## GET `/admin/vendors`

**Handler:** `AdminController.listVendors` — `apps/api/src/modules/admin/admin.controller.ts:136`

**Purpose:** List vendors for onboarding review

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query` `query: AdminVendorQueryDto` — [`AdminVendorQueryDto`](../request-response-dto-catalog.md#admin-vendor-query-dto)

**Success response declaration:**
- status `200` — Paginated list of vendors

**Controller → service:**
- Calls `AdminService.listVendors` at `apps/api/src/modules/admin/admin.controller.ts:140`; implementation: `apps/api/src/modules/admin/admin.service.ts:601`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findMany`, `vendor.count`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`AdminVendorQueryDto`](../request-response-dto-catalog.md#admin-vendor-query-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:136` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:601` — directly invoked service method.

## GET `/admin/vendors/:id`

**Handler:** `AdminController.getVendorDetails` — `apps/api/src/modules/admin/admin.controller.ts:143`

**Purpose:** Get full vendor details including requirements

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`

**Success response declaration:**
- status `200` — Vendor details retrieved

**Controller → service:**
- Calls `AdminService.getVendorDetails` at `apps/api/src/modules/admin/admin.controller.ts:147`; implementation: `apps/api/src/modules/admin/admin.service.ts:751`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `requirement.groupBy`, `payment.aggregate`, `requirement.findMany`, `payment.findMany`, `auditLog.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:143` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:751` — directly invoked service method.

## GET `/admin/vendors/:id/fulfillment`

**Handler:** `AdminController.getVendorFulfillment` — `apps/api/src/modules/admin/admin.controller.ts:150`

**Purpose:** Get trip fulfillment and arrived driver details for a vendor

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`

**Success response declaration:**
- status `200` — Vendor fulfillment details retrieved

**Controller → service:**
- Calls `AdminService.getVendorFulfillment` at `apps/api/src/modules/admin/admin.controller.ts:154`; implementation: `apps/api/src/modules/admin/admin.service.ts:967`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `requirement.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:150` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:967` — directly invoked service method.

## PATCH `/admin/vendors/:id`

**Handler:** `AdminController.updateVendor` — `apps/api/src/modules/admin/admin.controller.ts:157`

**Purpose:** Update vendor profile details (admin override)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: { organizationName?: string; fullName?: string; phone?: string; gstNumber?: string; address?: string }` — `{ organizationName?: string; fullName?: string; phone?: string; gstNumber?: string; address?: string }`

**Success response declaration:**
- status `200` — Vendor details updated

**Controller → service:**
- Calls `AdminService.updateVendor` at `apps/api/src/modules/admin/admin.controller.ts:165`; implementation: `apps/api/src/modules/admin/admin.service.ts:1692`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `user.update`, `vendor.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ organizationName?: string; fullName?: string; phone?: string; gstNumber?: string; address?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:157` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1692` — directly invoked service method.

## POST `/admin/vendors/:id/verify`

**Handler:** `AdminController.verifyVendor` — `apps/api/src/modules/admin/admin.controller.ts:168`

**Purpose:** Verify vendor organization

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyVendorDto` — [`VerifyVendorDto`](../request-response-dto-catalog.md#verify-vendor-dto)

**Success response declaration:**
- status `200` — Vendor verified successfully

**Controller → service:**
- Calls `AdminService.verifyVendor` at `apps/api/src/modules/admin/admin.controller.ts:177`; implementation: `apps/api/src/modules/admin/admin.service.ts:1750`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `vendor.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VerifyVendorDto`](../request-response-dto-catalog.md#verify-vendor-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:168` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1750` — directly invoked service method.

## POST `/admin/vendors/:id/reject`

**Handler:** `AdminController.rejectVendor` — `apps/api/src/modules/admin/admin.controller.ts:180`

**Purpose:** Reject vendor organization with mandatory reason

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: RejectVendorDto` — [`RejectVendorDto`](../request-response-dto-catalog.md#reject-vendor-dto)

**Success response declaration:**
- status `200` — Vendor rejected

**Controller → service:**
- Calls `AdminService.rejectVendor` at `apps/api/src/modules/admin/admin.controller.ts:189`; implementation: `apps/api/src/modules/admin/admin.service.ts:1795`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `vendor.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`RejectVendorDto`](../request-response-dto-catalog.md#reject-vendor-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:180` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1795` — directly invoked service method.

## DELETE `/admin/vendors/:id`

**Handler:** `AdminController.deleteVendor` — `apps/api/src/modules/admin/admin.controller.ts:192`

**Purpose:** Permanently delete vendor account and cascade records

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — Vendor deleted permanently

**Controller → service:**
- Calls `AdminService.deleteVendor` at `apps/api/src/modules/admin/admin.controller.ts:200`; implementation: `apps/api/src/modules/admin/admin.service.ts:4157`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `vendor.findFirst`, `user.delete`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:192` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:4157` — directly invoked service method.

## GET `/admin/users`

**Handler:** `AdminController.listUsers` — `apps/api/src/modules/admin/admin.controller.ts:205`

**Purpose:** List platform users with filtering, role, status, and search

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(page)` `page: number` — `number`
- `@Query(limit)` `limit: number` — `number`
- `@Query(status)` `status: string` — `string`
- `@Query(role)` `role: string` — `string`
- `@Query(search)` `search: string` — `string`

**Success response declaration:**
- status `200` — Paginated list of platform users

**Controller → service:**
- Calls `AdminService.listUsers` at `apps/api/src/modules/admin/admin.controller.ts:215`; implementation: `apps/api/src/modules/admin/admin.service.ts:1201`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findMany`, `user.count`, `requirement.groupBy`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `number`, `number`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:205` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1201` — directly invoked service method.

## GET `/admin/users/:id`

**Handler:** `AdminController.getUserDetails` — `apps/api/src/modules/admin/admin.controller.ts:224`

**Purpose:** Get full user details including orders, location, and activity history

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`

**Success response declaration:**
- status `200` — User profile details retrieved

**Controller → service:**
- Calls `AdminService.getUserDetails` at `apps/api/src/modules/admin/admin.controller.ts:228`; implementation: `apps/api/src/modules/admin/admin.service.ts:1293`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:224` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1293` — directly invoked service method.

## PATCH `/admin/users/:id`

**Handler:** `AdminController.updateUser` — `apps/api/src/modules/admin/admin.controller.ts:231`

**Purpose:** Update user profile details

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: { fullName?: string; phone?: string; email?: string; status?: any; address?: string }` — `{ fullName?: string; phone?: string; email?: string; status?: any; address?: string }`

**Success response declaration:**
- status `200` — User profile updated

**Controller → service:**
- Calls `AdminService.updateUser` at `apps/api/src/modules/admin/admin.controller.ts:239`; implementation: `apps/api/src/modules/admin/admin.service.ts:1437`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`, `user.update`, `vendor.update`, `corporateEmployeeLocation.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ fullName?: string; phone?: string; email?: string; status?: any; address?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:231` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1437` — directly invoked service method.

## POST `/admin/users/:id/status`

**Handler:** `AdminController.updateUserStatus` — `apps/api/src/modules/admin/admin.controller.ts:242`

**Purpose:** Update user account status (ACTIVE, SUSPENDED, DEACTIVATED)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: { status: PrismaUserStatus; reason?: string }` — `{ status: PrismaUserStatus; reason?: string }`

**Success response declaration:**
- status `200` — User status updated

**Controller → service:**
- Calls `AdminService.updateUserStatus` at `apps/api/src/modules/admin/admin.controller.ts:251`; implementation: `apps/api/src/modules/admin/admin.service.ts:1486`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.updateMany`, `user.findUnique`, `user.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ status: PrismaUserStatus; reason?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:242` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1486` — directly invoked service method.

## POST `/admin/vendors/:id/status`

**Handler:** `AdminController.updateVendorStatus` — `apps/api/src/modules/admin/admin.controller.ts:254`

**Purpose:** Update vendor account status (ACTIVE, SUSPENDED, DEACTIVATED, VERIFIED)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: { status: string; reason?: string }` — `{ status: string; reason?: string }`

**Success response declaration:**
- status `200` — Vendor status updated

**Controller → service:**
- Calls `AdminService.updateVendorStatus` at `apps/api/src/modules/admin/admin.controller.ts:263`; implementation: `apps/api/src/modules/admin/admin.service.ts:1535`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `vendor.update`, `user.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ status: string; reason?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:254` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1535` — directly invoked service method.

## DELETE `/admin/users/:id`

**Handler:** `AdminController.deleteUser` — `apps/api/src/modules/admin/admin.controller.ts:266`

**Purpose:** Permanently delete user account and cascade records

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — User deleted permanently

**Controller → service:**
- Calls `AdminService.deleteUser` at `apps/api/src/modules/admin/admin.controller.ts:274`; implementation: `apps/api/src/modules/admin/admin.service.ts:4206`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`, `user.delete`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:266` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:4206` — directly invoked service method.

## GET `/admin/metrics`

**Handler:** `AdminController.getMetrics` — `apps/api/src/modules/admin/admin.controller.ts:279`

**Purpose:** Get operational KPI metrics across the platform

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- status `200` — KPI metrics retrieved

**Controller → service:**
- Calls `AdminService.getOperationalMetrics` at `apps/api/src/modules/admin/admin.controller.ts:283`; implementation: `apps/api/src/modules/admin/admin.service.ts:1844`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.count`, `vendor.count`, `user.count`, `requirement.count`, `trip.count`, `settlement.count`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:279` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1844` — directly invoked service method.

## GET `/admin/audit-logs`

**Handler:** `AdminController.getAuditLogs` — `apps/api/src/modules/admin/admin.controller.ts:286`

**Purpose:** Get platform audit logs

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(limit)` `limit: number` — `number`

**Success response declaration:**
- status `200` — Audit logs retrieved

**Controller → service:**
- Calls `AdminService.getAuditLogs` at `apps/api/src/modules/admin/admin.controller.ts:290`; implementation: `apps/api/src/modules/admin/admin.service.ts:1906`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `auditLog.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `number`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:286` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1906` — directly invoked service method.

## GET `/admin/finance/dashboard`

**Handler:** `AdminController.getFinanceDashboard` — `apps/api/src/modules/admin/admin.controller.ts:295`

**Purpose:** Get aggregated financial dashboard metrics, revenue trends, and driver payouts

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(range)` `range: string` — `string`
- `@Query(startDate)` `startDate: string` — `string`
- `@Query(endDate)` `endDate: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getFinanceDashboard` at `apps/api/src/modules/admin/admin.controller.ts:302`; implementation: `apps/api/src/modules/admin/admin.service.ts:2934`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findMany`, `payment.findMany`, `settlement.findMany`, `settlement.aggregate`, `driver.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:295` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:2934` — directly invoked service method.

## GET `/admin/finance/transactions`

**Handler:** `AdminController.getFinanceTransactions` — `apps/api/src/modules/admin/admin.controller.ts:305`

**Purpose:** Get unified financial transactions with pagination and search

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(page)` `page: number` — `number`
- `@Query(limit)` `limit: number` — `number`
- `@Query(status)` `status: string` — `string`
- `@Query(search)` `search: string` — `string`
- `@Query(range)` `range: string` — `string`
- `@Query(startDate)` `startDate: string` — `string`
- `@Query(endDate)` `endDate: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getFinanceTransactions` at `apps/api/src/modules/admin/admin.controller.ts:316`; implementation: `apps/api/src/modules/admin/admin.service.ts:3770`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `number`, `number`, `string`, `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:305` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:3770` — directly invoked service method.

## GET `/admin/finance/driver/:id`

**Handler:** `AdminController.getDriverFinancialHistory` — `apps/api/src/modules/admin/admin.controller.ts:327`

**Purpose:** Get individual driver earnings, payout history, and ledger breakdown

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getDriverFinancialHistory` at `apps/api/src/modules/admin/admin.controller.ts:330`; implementation: `apps/api/src/modules/admin/admin.service.ts:3812`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:327` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:3812` — directly invoked service method.

## GET `/admin/reports/corridors`

**Handler:** `AdminController.getCorridors` — `apps/api/src/modules/admin/admin.controller.ts:335`

**Purpose:** Get corridor demand density and route fulfillment analytics

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(range)` `range: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getCorridorAnalytics` at `apps/api/src/modules/admin/admin.controller.ts:339`; implementation: `apps/api/src/modules/admin/admin.service.ts:1936`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `requirement.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:335` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1936` — directly invoked service method.

## GET `/admin/corridors`

**Handler:** `AdminController.getCorridors` — `apps/api/src/modules/admin/admin.controller.ts:335`

**Purpose:** Get corridor demand density and route fulfillment analytics

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(range)` `range: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getCorridorAnalytics` at `apps/api/src/modules/admin/admin.controller.ts:339`; implementation: `apps/api/src/modules/admin/admin.service.ts:1936`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `requirement.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:335` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1936` — directly invoked service method.

## GET `/admin/reports/trips`

**Handler:** `AdminController.getTripFrequencyReport` — `apps/api/src/modules/admin/admin.controller.ts:342`

**Purpose:** Get monthly trip frequency and an optional selected-day trip report

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(year)` `year: string` — `string`
- `@Query(month)` `month: string` — `string`
- `@Query(day)` `day: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getTripFrequencyReport` at `apps/api/src/modules/admin/admin.controller.ts:349`; implementation: `apps/api/src/modules/admin/admin.service.ts:2389`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findMany`, `trip.groupBy`, `trip.count`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:342` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:2389` — directly invoked service method.

## GET `/admin/reports/trips/weekly`

**Handler:** `AdminController.getWeeklyTripFrequencyReport` — `apps/api/src/modules/admin/admin.controller.ts:352`

**Purpose:** Get a Monday-to-Sunday trip report and an optional selected-day report

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(weekStart)` `weekStart: string` — `string`
- `@Query(day)` `day: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getWeeklyTripFrequencyReport` at `apps/api/src/modules/admin/admin.controller.ts:358`; implementation: `apps/api/src/modules/admin/admin.service.ts:2495`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findMany`, `trip.groupBy`, `trip.count`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:352` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:2495` — directly invoked service method.

## GET `/admin/reports/financial-companies`

**Handler:** `AdminController.getFinancialCompanies` — `apps/api/src/modules/admin/admin.controller.ts:361`

**Purpose:** List all available companies (vendors and corporate tenants) sorted A-Z for financial metrics

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getFinancialCompanies` at `apps/api/src/modules/admin/admin.controller.ts:364`; implementation: `apps/api/src/modules/admin/admin.service.ts:2627`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findMany`, `corporateTenant.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:361` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:2627` — directly invoked service method.

## GET `/admin/reports/financial-daily`

**Handler:** `AdminController.getDailyFinancialReport` — `apps/api/src/modules/admin/admin.controller.ts:367`

**Purpose:** Get date-filtered booking volume, settled payouts, and active escrow holds

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(date)` `date: string` — `string`
- `@Query(companyId)` `companyId: string` — `string`
- `@Query(companyType)` `companyType: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getDailyFinancialReport` at `apps/api/src/modules/admin/admin.controller.ts:374`; implementation: `apps/api/src/modules/admin/admin.service.ts:2703`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `corporateTenant.findUnique`, `corporateInvoice.findMany`, `corporateDriverEarning.findMany`, `corporatePayout.findMany`, `payment.findMany`, `trip.findMany`, `settlement.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:367` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:2703` — directly invoked service method.

## GET `/admin/reports/analytics-trends`

**Handler:** `AdminController.getAnalyticsTrends` — `apps/api/src/modules/admin/admin.controller.ts:377`

**Purpose:** Get comprehensive real-time business analytics and trends with date filters

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(range)` `range: string` — `string`
- `@Query(startDate)` `startDate: string` — `string`
- `@Query(endDate)` `endDate: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getAnalyticsTrends` at `apps/api/src/modules/admin/admin.controller.ts:385`; implementation: `apps/api/src/modules/admin/admin.service.ts:3270`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findMany`, `payment.findMany`, `requirement.findMany`, `driver.findMany`, `vendor.findMany`, `corporateTenant.findMany`, `user.findMany`, `corporateEmployee.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:377` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:3270` — directly invoked service method.

## GET `/admin/analytics/trends`

**Handler:** `AdminController.getAnalyticsTrends` — `apps/api/src/modules/admin/admin.controller.ts:377`

**Purpose:** Get comprehensive real-time business analytics and trends with date filters

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(range)` `range: string` — `string`
- `@Query(startDate)` `startDate: string` — `string`
- `@Query(endDate)` `endDate: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getAnalyticsTrends` at `apps/api/src/modules/admin/admin.controller.ts:385`; implementation: `apps/api/src/modules/admin/admin.service.ts:3270`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `trip.findMany`, `payment.findMany`, `requirement.findMany`, `driver.findMany`, `vendor.findMany`, `corporateTenant.findMany`, `user.findMany`, `corporateEmployee.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:377` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:3270` — directly invoked service method.

## GET `/admin/reports/analytics`

**Handler:** `AdminController.getOperationalReports` — `apps/api/src/modules/admin/admin.controller.ts:388`

**Purpose:** Get operational SLA performance and driver payout metrics

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getOperationalReports` at `apps/api/src/modules/admin/admin.controller.ts:392`; implementation: `apps/api/src/modules/admin/admin.service.ts:1988`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `requirement.count`, `trip.count`, `driver.count`, `vendor.count`, `trip.findMany`, `assignment.findMany`, `requirement.groupBy`, `driver.findMany`, `settlement.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:388` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1988` — directly invoked service method.

## GET `/admin/reports`

**Handler:** `AdminController.getOperationalReports` — `apps/api/src/modules/admin/admin.controller.ts:388`

**Purpose:** Get operational SLA performance and driver payout metrics

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getOperationalReports` at `apps/api/src/modules/admin/admin.controller.ts:392`; implementation: `apps/api/src/modules/admin/admin.service.ts:1988`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `requirement.count`, `trip.count`, `driver.count`, `vendor.count`, `trip.findMany`, `assignment.findMany`, `requirement.groupBy`, `driver.findMany`, `settlement.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:388` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:1988` — directly invoked service method.

## GET `/admin/support/tickets`

**Handler:** `AdminController.getSupportTickets` — `apps/api/src/modules/admin/admin.controller.ts:397`

**Purpose:** List support helpdesk and conflict tickets

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(status)` `status: string` — `string`
- `@Query(search)` `search: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.getSupportTickets` at `apps/api/src/modules/admin/admin.controller.ts:403`; implementation: `apps/api/src/modules/admin/admin.service.ts:3897`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `dispute.findMany`, `leadCapture.findMany`, `corporateSupportTicket.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:397` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:3897` — directly invoked service method.

## POST `/admin/support/tickets/:id/resolve`

**Handler:** `AdminController.resolveSupportTicket` — `apps/api/src/modules/admin/admin.controller.ts:406`

**Purpose:** Resolve support helpdesk ticket

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id)` `id: string`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: { status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED'; notes?: string }` — `{ status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED'; notes?: string }`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `AdminService.resolveSupportTicket` at `apps/api/src/modules/admin/admin.controller.ts:414`; implementation: `apps/api/src/modules/admin/admin.service.ts:4065`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporateSupportTicket.findUnique`, `corporateSupportTicket.update`, `dispute.findUnique`, `dispute.update`, `leadCapture.findUnique`, `leadCapture.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED'; notes?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/admin/admin.controller.ts:406` — route decorator and handler.
- `apps/api/src/modules/admin/admin.service.ts:4065` — directly invoked service method.
