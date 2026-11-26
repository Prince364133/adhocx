---
title: DriversController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for DriversController.
status: partial
last_reviewed: "2026-11-23"
---

# DriversController Endpoint Reference

**Stable controller ID:** `API-CTRL-DRIVERS`  
**Controller source:** `apps/api/src/modules/drivers/drivers.controller.ts:27`  
**Nest route prefix:** `drivers`  
**Swagger tags:** `Drivers`  
**Route methods:** 8; **decorated path variants:** 8

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/drivers/profile`

**Handler:** `DriversController.getProfile` — `apps/api/src/modules/drivers/drivers.controller.ts:34`

**Purpose:** Get current driver profile

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN, UserRole.VENDOR`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DriversService.getProfile` at `apps/api/src/modules/drivers/drivers.controller.ts:38`; implementation: `apps/api/src/modules/drivers/drivers.service.ts:133`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `user.findUnique`, `driver.create`, `driver.update`, `user.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/drivers/drivers.controller.ts:34` — route decorator and handler.
- `apps/api/src/modules/drivers/drivers.service.ts:133` — directly invoked service method.

## PATCH `/drivers/profile`

**Handler:** `DriversController.updateProfile` — `apps/api/src/modules/drivers/drivers.controller.ts:41`

**Purpose:** Update driver profile details

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN, UserRole.VENDOR`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: UpdateDriverProfileDto` — [`UpdateDriverProfileDto`](../request-response-dto-catalog.md#update-driver-profile-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DriversService.updateProfile` at `apps/api/src/modules/drivers/drivers.controller.ts:48`; implementation: `apps/api/src/modules/drivers/drivers.service.ts:269`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `user.findUnique`, `driver.create`, `user.update`, `driver.update`, `vehicle.findFirst`, `vehicle.update`, `vehicle.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateDriverProfileDto`](../request-response-dto-catalog.md#update-driver-profile-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/drivers/drivers.controller.ts:41` — route decorator and handler.
- `apps/api/src/modules/drivers/drivers.service.ts:269` — directly invoked service method.

## PATCH `/drivers/bank-details`

**Handler:** `DriversController.updateBankDetails` — `apps/api/src/modules/drivers/drivers.controller.ts:51`

**Purpose:** Update driver bank payout details

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: UpdateBankDetailsDto` — [`UpdateBankDetailsDto`](../request-response-dto-catalog.md#update-bank-details-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DriversService.updateBankDetails` at `apps/api/src/modules/drivers/drivers.controller.ts:58`; implementation: `apps/api/src/modules/drivers/drivers.service.ts:438`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateBankDetailsDto`](../request-response-dto-catalog.md#update-bank-details-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/drivers/drivers.controller.ts:51` — route decorator and handler.
- `apps/api/src/modules/drivers/drivers.service.ts:438` — directly invoked service method.

## GET `/drivers/trust-score`

**Handler:** `DriversController.getTrustScore` — `apps/api/src/modules/drivers/drivers.controller.ts:61`

**Purpose:** Get driver performance and trust score 100-point breakdown

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DriversService.getTrustScoreBreakdown` at `apps/api/src/modules/drivers/drivers.controller.ts:65`; implementation: `apps/api/src/modules/drivers/drivers.service.ts:978`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `user.findUnique`, `driver.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/drivers/drivers.controller.ts:61` — route decorator and handler.
- `apps/api/src/modules/drivers/drivers.service.ts:978` — directly invoked service method.

## PATCH `/drivers/availability`

**Handler:** `DriversController.updateAvailability` — `apps/api/src/modules/drivers/drivers.controller.ts:68`

**Purpose:** Update driver availability status and location

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: UpdateAvailabilityDto` — [`UpdateAvailabilityDto`](../request-response-dto-catalog.md#update-availability-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DriversService.updateAvailability` at `apps/api/src/modules/drivers/drivers.controller.ts:75`; implementation: `apps/api/src/modules/drivers/drivers.service.ts:473`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`, `offer.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateAvailabilityDto`](../request-response-dto-catalog.md#update-availability-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/drivers/drivers.controller.ts:68` — route decorator and handler.
- `apps/api/src/modules/drivers/drivers.service.ts:473` — directly invoked service method.

## POST `/drivers/location`

**Handler:** `DriversController.reportLocation` — `apps/api/src/modules/drivers/drivers.controller.ts:78`

**Purpose:** Idle location heartbeat while AVAILABLE (every ~30 s). Only GPS-quality fixes make the driver dispatchable; returns { indexed, reason? }

**Actor/access declaration:** Declared roles: `UserRole.DRIVER`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: DriverLocationPingDto` — [`DriverLocationPingDto`](../request-response-dto-catalog.md#driver-location-ping-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DriversService.reportLocation` at `apps/api/src/modules/drivers/drivers.controller.ts:85`; implementation: `apps/api/src/modules/drivers/drivers.service.ts:90`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`DriverLocationPingDto`](../request-response-dto-catalog.md#driver-location-ping-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/drivers/drivers.controller.ts:78` — route decorator and handler.
- `apps/api/src/modules/drivers/drivers.service.ts:90` — directly invoked service method.

## POST `/drivers/kyc`

**Handler:** `DriversController.submitKyc` — `apps/api/src/modules/drivers/drivers.controller.ts:88`

**Purpose:** Submit driver KYC details for verification

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN, UserRole.VENDOR`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: KycSubmissionDto` — [`KycSubmissionDto`](../request-response-dto-catalog.md#kyc-submission-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DriversService.submitKyc` at `apps/api/src/modules/drivers/drivers.controller.ts:95`; implementation: `apps/api/src/modules/drivers/drivers.service.ts:520`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `user.findUnique`, `user.update`, `driver.update`, `vehicle.findFirst`, `vehicle.update`, `vehicle.create`, `driver.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`KycSubmissionDto`](../request-response-dto-catalog.md#kyc-submission-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/drivers/drivers.controller.ts:88` — route decorator and handler.
- `apps/api/src/modules/drivers/drivers.service.ts:520` — directly invoked service method.

## POST `/drivers/documents/upload`

**Handler:** `DriversController.uploadDocument` — `apps/api/src/modules/drivers/drivers.controller.ts:98`

**Purpose:** Upload a driver KYC document to Cloudflare R2 (supports multipart/form-data or base64 JSON)

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN, UserRole.VENDOR`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: UploadDocumentDto` — [`UploadDocumentDto`](../request-response-dto-catalog.md#upload-document-dto)
- `@UploadedFile` `file: { buffer: Buffer; originalname: string; mimetype: string; size: number }`

**Success response declaration:**
- status `201` — Document uploaded successfully — type [`UploadDocumentResponseDto`](../request-response-dto-catalog.md#upload-document-response-dto)

**Controller → service:**
- Calls `DriversService.uploadDocument` at `apps/api/src/modules/drivers/drivers.controller.ts:115`; implementation: `apps/api/src/modules/drivers/drivers.service.ts:850`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `user.findUnique`, `driver.create`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UploadDocumentDto`](../request-response-dto-catalog.md#upload-document-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/drivers/drivers.controller.ts:98` — route decorator and handler.
- `apps/api/src/modules/drivers/drivers.service.ts:850` — directly invoked service method.
