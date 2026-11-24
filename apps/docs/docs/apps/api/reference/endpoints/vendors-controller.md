---
title: VendorsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for VendorsController.
status: partial
last_reviewed: "2026-11-23"
---

# VendorsController Endpoint Reference

**Stable controller ID:** `API-CTRL-VENDORS`  
**Controller source:** `apps/api/src/modules/vendors/vendors.controller.ts:9`  
**Nest route prefix:** `vendors`  
**Swagger tags:** `Vendors`  
**Route methods:** 4; **decorated path variants:** 4

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/vendors/profile`

**Handler:** `VendorsController.createProfile` — `apps/api/src/modules/vendors/vendors.controller.ts:16`

**Purpose:** Create or update vendor profile

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: CreateVendorProfileDto` — `CreateVendorProfileDto`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `VendorsService.createProfile` at `apps/api/src/modules/vendors/vendors.controller.ts:23`; implementation: `apps/api/src/modules/vendors/vendors.service.ts:14`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`, `vendor.findUnique`, `user.update`, `vendor.upsert`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `CreateVendorProfileDto`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/vendors/vendors.controller.ts:16` — route decorator and handler.
- `apps/api/src/modules/vendors/vendors.service.ts:14` — directly invoked service method.

## PATCH `/vendors/profile`

**Handler:** `VendorsController.updateProfile` — `apps/api/src/modules/vendors/vendors.controller.ts:26`

**Purpose:** Update vendor profile

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: any` — `any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `VendorsService.updateProfile` at `apps/api/src/modules/vendors/vendors.controller.ts:33`; implementation: `apps/api/src/modules/vendors/vendors.service.ts:146`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/vendors/vendors.controller.ts:26` — route decorator and handler.
- `apps/api/src/modules/vendors/vendors.service.ts:146` — directly invoked service method.

## POST `/vendors/profile-photo`

**Handler:** `VendorsController.uploadProfilePhoto` — `apps/api/src/modules/vendors/vendors.controller.ts:36`

**Purpose:** Upload vendor profile image to Cloudflare R2 (multipart or base64 JSON)

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: { contentBase64?: string; filename?: string; mimeType?: string }` — `{ contentBase64?: string; filename?: string; mimeType?: string }`
- `@UploadedFile` `file: { buffer: Buffer; originalname: string; mimetype: string; size: number }`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `VendorsService.uploadProfilePhoto` at `apps/api/src/modules/vendors/vendors.controller.ts:52`; implementation: `apps/api/src/modules/vendors/vendors.service.ts:150`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`, `vendor.findUnique`, `vendor.update`, `vendor.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ contentBase64?: string; filename?: string; mimeType?: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/vendors/vendors.controller.ts:36` — route decorator and handler.
- `apps/api/src/modules/vendors/vendors.service.ts:150` — directly invoked service method.

## GET `/vendors/profile`

**Handler:** `VendorsController.getProfile` — `apps/api/src/modules/vendors/vendors.controller.ts:55`

**Purpose:** Get current vendor profile

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN, UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `VendorsService.getProfile` at `apps/api/src/modules/vendors/vendors.controller.ts:59`; implementation: `apps/api/src/modules/vendors/vendors.service.ts:222`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `user.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/vendors/vendors.controller.ts:55` — route decorator and handler.
- `apps/api/src/modules/vendors/vendors.service.ts:222` — directly invoked service method.
