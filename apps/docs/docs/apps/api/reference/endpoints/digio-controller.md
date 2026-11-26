---
title: DigioController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for DigioController.
status: partial
last_reviewed: "2026-11-23"
---

# DigioController Endpoint Reference

**Stable controller ID:** `API-CTRL-DIGIO`  
**Controller source:** `apps/api/src/modules/digio/digio.controller.ts:56`  
**Nest route prefix:** `kyc/digio`  
**Swagger tags:** `Digio KYC / KYB`  
**Route methods:** 40; **decorated path variants:** 40

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## GET `/kyc/digio/capabilities`

**Handler:** `DigioController.getCapabilities` — `apps/api/src/modules/digio/digio.controller.ts:66`

**Purpose:** Check Digio integration status & supported checks

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.getCapabilities` at `apps/api/src/modules/digio/digio.controller.ts:71`; implementation: `apps/api/src/modules/digio/digio.service.ts:773`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:66` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:773` — directly invoked service method.

## GET `/kyc/digio/me`

**Handler:** `DigioController.getMyVerifications` — `apps/api/src/modules/digio/digio.controller.ts:74`

**Purpose:** Get Digio KYC/KYB verification history for current user

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.getMyVerifications` at `apps/api/src/modules/digio/digio.controller.ts:79`; implementation: `apps/api/src/modules/digio/digio.service.ts:808`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `digioVerification.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:74` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:808` — directly invoked service method.

## GET `/kyc/digio/consent`

**Handler:** `DigioController.getAadhaarConsent` — `apps/api/src/modules/digio/digio.controller.ts:86`

**Purpose:** Whether the caller has a valid Aadhaar processing consent on record

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.getAadhaarConsent` at `apps/api/src/modules/digio/digio.controller.ts:91`; implementation: `apps/api/src/modules/digio/digio.service.ts:664`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:86` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:664` — directly invoked service method.

## POST `/kyc/digio/consent`

**Handler:** `DigioController.recordAadhaarConsent` — `apps/api/src/modules/digio/digio.controller.ts:94`

**Purpose:** Record the driver's explicit consent to Aadhaar processing (who, when, text version, IP)

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: RecordAadhaarConsentDto` — [`RecordAadhaarConsentDto`](../request-response-dto-catalog.md#record-aadhaar-consent-dto)
- `@Req` `req: Request`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.recordAadhaarConsent` at `apps/api/src/modules/digio/digio.controller.ts:102`; implementation: `apps/api/src/modules/digio/digio.service.ts:631`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`RecordAadhaarConsentDto`](../request-response-dto-catalog.md#record-aadhaar-consent-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:94` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:631` — directly invoked service method.

## POST `/kyc/digio/pan`

**Handler:** `DigioController.verifyPan` — `apps/api/src/modules/digio/digio.controller.ts:109`

**Purpose:** Verify PAN card via Digio

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyPanDto` — [`VerifyPanDto`](../request-response-dto-catalog.md#verify-pan-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyPan` at `apps/api/src/modules/digio/digio.controller.ts:115`; implementation: `apps/api/src/modules/digio/digio.service.ts:1007`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VerifyPanDto`](../request-response-dto-catalog.md#verify-pan-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:109` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1007` — directly invoked service method.

## POST `/kyc/digio/pan/kra`

**Handler:** `DigioController.verifyKraPan` — `apps/api/src/modules/digio/digio.controller.ts:118`

**Purpose:** Check KRA PAN KYC status via Digio

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyKraPanDto` — [`VerifyKraPanDto`](../request-response-dto-catalog.md#verify-kra-pan-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyKraPan` at `apps/api/src/modules/digio/digio.controller.ts:124`; implementation: `apps/api/src/modules/digio/digio.service.ts:1082`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`VerifyKraPanDto`](../request-response-dto-catalog.md#verify-kra-pan-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:118` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1082` — directly invoked service method.

## POST `/kyc/digio/dl`

**Handler:** `DigioController.verifyDl` — `apps/api/src/modules/digio/digio.controller.ts:127`

**Purpose:** Verify Driving License & COV transport validity via Digio

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyDrivingLicenseDto` — [`VerifyDrivingLicenseDto`](../request-response-dto-catalog.md#verify-driving-license-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyDrivingLicense` at `apps/api/src/modules/digio/digio.controller.ts:136`; implementation: `apps/api/src/modules/digio/digio.service.ts:1120`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VerifyDrivingLicenseDto`](../request-response-dto-catalog.md#verify-driving-license-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:127` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1120` — directly invoked service method.

## POST `/kyc/digio/vehicle-rc`

**Handler:** `DigioController.verifyVehicleRc` — `apps/api/src/modules/digio/digio.controller.ts:139`

**Purpose:** Verify Vehicle RC (Vahan: fitness, insurance, permit, PUCC, blacklist)

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyVehicleRcDto` — [`VerifyVehicleRcDto`](../request-response-dto-catalog.md#verify-vehicle-rc-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyVehicleRc` at `apps/api/src/modules/digio/digio.controller.ts:148`; implementation: `apps/api/src/modules/digio/digio.service.ts:1181`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vehicle.findFirst`, `vehicle.update`, `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VerifyVehicleRcDto`](../request-response-dto-catalog.md#verify-vehicle-rc-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadGatewayException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:139` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1181` — directly invoked service method.

## POST `/kyc/digio/vehicle-insurance`

**Handler:** `DigioController.verifyVehicleInsurance` — `apps/api/src/modules/digio/digio.controller.ts:151`

**Purpose:** Verify Commercial Insurance policy number against Parivahan RC record

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyVehicleInsuranceDto` — [`VerifyVehicleInsuranceDto`](../request-response-dto-catalog.md#verify-vehicle-insurance-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyVehicleInsurance` at `apps/api/src/modules/digio/digio.controller.ts:160`; implementation: `apps/api/src/modules/digio/digio.service.ts:1282`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `digioVerification.findFirst`, `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VerifyVehicleInsuranceDto`](../request-response-dto-catalog.md#verify-vehicle-insurance-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `BadGatewayException`, `UnprocessableEntityException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:151` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1282` — directly invoked service method.

## POST `/kyc/digio/passport`

**Handler:** `DigioController.verifyPassport` — `apps/api/src/modules/digio/digio.controller.ts:163`

**Purpose:** Verify Indian Passport via Digio

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyPassportDto` — [`VerifyPassportDto`](../request-response-dto-catalog.md#verify-passport-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyPassport` at `apps/api/src/modules/digio/digio.controller.ts:172`; implementation: `apps/api/src/modules/digio/digio.service.ts:1458`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`VerifyPassportDto`](../request-response-dto-catalog.md#verify-passport-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:163` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1458` — directly invoked service method.

## POST `/kyc/digio/voter-id`

**Handler:** `DigioController.verifyVoterId` — `apps/api/src/modules/digio/digio.controller.ts:175`

**Purpose:** Verify Voter ID (EPIC) via Digio

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyVoterIdDto` — [`VerifyVoterIdDto`](../request-response-dto-catalog.md#verify-voter-id-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyVoterId` at `apps/api/src/modules/digio/digio.controller.ts:181`; implementation: `apps/api/src/modules/digio/digio.service.ts:1489`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`VerifyVoterIdDto`](../request-response-dto-catalog.md#verify-voter-id-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:175` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1489` — directly invoked service method.

## POST `/kyc/digio/id-card/analyze-stored`

**Handler:** `DigioController.analyzeStoredIdCard` — `apps/api/src/modules/digio/digio.controller.ts:188`

**Purpose:** OCR, verify & optionally mask Aadhaar from stored document URLs

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: AnalyzeStoredIdCardDto` — [`AnalyzeStoredIdCardDto`](../request-response-dto-catalog.md#analyze-stored-id-card-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.analyzeStoredIdCard` at `apps/api/src/modules/digio/digio.controller.ts:197`; implementation: `apps/api/src/modules/digio/digio.service.ts:1703`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`AnalyzeStoredIdCardDto`](../request-response-dto-catalog.md#analyze-stored-id-card-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:188` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1703` — directly invoked service method.

## POST `/kyc/digio/id-card/analyze`

**Handler:** `DigioController.analyzeUploadedIdCard` — `apps/api/src/modules/digio/digio.controller.ts:200`

**Purpose:** Upload 1 or 2 ID images for Digio OCR, verification & Aadhaar masking

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@UploadedFiles` `files: Express.Multer.File[]`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.analyzeIdCardFiles` at `apps/api/src/modules/digio/digio.controller.ts:213`; implementation: `apps/api/src/modules/digio/digio.service.ts:1537`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:200` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1537` — directly invoked service method.

## POST `/kyc/digio/aadhaar/mask-stored`

**Handler:** `DigioController.maskStoredAadhaar` — `apps/api/src/modules/digio/digio.controller.ts:229`

**Purpose:** Mask Aadhaar first 8 digits from stored Aadhaar URL & update driver record

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: MaskStoredAadhaarDto` — [`MaskStoredAadhaarDto`](../request-response-dto-catalog.md#mask-stored-aadhaar-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.maskStoredAadhaar` at `apps/api/src/modules/digio/digio.controller.ts:238`; implementation: `apps/api/src/modules/digio/digio.service.ts:1806`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`MaskStoredAadhaarDto`](../request-response-dto-catalog.md#mask-stored-aadhaar-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:229` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1806` — directly invoked service method.

## POST `/kyc/digio/aadhaar/mask`

**Handler:** `DigioController.maskUploadedAadhaar` — `apps/api/src/modules/digio/digio.controller.ts:241`

**Purpose:** Mask Aadhaar digits on an uploaded Aadhaar file

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@UploadedFile` `file: Express.Multer.File`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.maskAadhaarFileBuffer` at `apps/api/src/modules/digio/digio.controller.ts:254`; implementation: `apps/api/src/modules/digio/digio.service.ts:1752`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:241` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1752` — directly invoked service method.

## POST `/kyc/digio/biometric/face-match-stored`

**Handler:** `DigioController.faceMatchStored` — `apps/api/src/modules/digio/digio.controller.ts:265`

**Purpose:** Compare stored profile selfie vs stored ID photo via Digio FaceMatch

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: FaceMatchStoredDto` — [`FaceMatchStoredDto`](../request-response-dto-catalog.md#face-match-stored-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.faceMatchStored` at `apps/api/src/modules/digio/digio.controller.ts:274`; implementation: `apps/api/src/modules/digio/digio.service.ts:1874`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`FaceMatchStoredDto`](../request-response-dto-catalog.md#face-match-stored-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:265` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1874` — directly invoked service method.

## POST `/kyc/digio/biometric/face-match`

**Handler:** `DigioController.faceMatchUpload` — `apps/api/src/modules/digio/digio.controller.ts:277`

**Purpose:** Compare two uploaded face images via Digio FaceMatch

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@UploadedFiles` `files: Express.Multer.File[]`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.faceMatchBuffers` at `apps/api/src/modules/digio/digio.controller.ts:290`; implementation: `apps/api/src/modules/digio/digio.service.ts:1819`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:277` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1819` — directly invoked service method.

## POST `/kyc/digio/biometric/liveness-stored`

**Handler:** `DigioController.livenessStored` — `apps/api/src/modules/digio/digio.controller.ts:304`

**Purpose:** Run passive selfie liveness check on stored profile photo

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: LivenessStoredDto` — [`LivenessStoredDto`](../request-response-dto-catalog.md#liveness-stored-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.checkStoredLiveness` at `apps/api/src/modules/digio/digio.controller.ts:313`; implementation: `apps/api/src/modules/digio/digio.service.ts:1964`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`LivenessStoredDto`](../request-response-dto-catalog.md#liveness-stored-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:304` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1964` — directly invoked service method.

## POST `/kyc/digio/biometric/liveness`

**Handler:** `DigioController.livenessUpload` — `apps/api/src/modules/digio/digio.controller.ts:316`

**Purpose:** Run passive selfie liveness check on an uploaded photo

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@UploadedFile` `file: Express.Multer.File`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.checkLivenessBuffer` at `apps/api/src/modules/digio/digio.controller.ts:329`; implementation: `apps/api/src/modules/digio/digio.service.ts:1917`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:316` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1917` — directly invoked service method.

## POST `/kyc/digio/bank/ifsc`

**Handler:** `DigioController.verifyIfsc` — `apps/api/src/modules/digio/digio.controller.ts:340`

**Purpose:** Lookup bank/branch & payment rails for an IFSC code via Digio

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyIfscDto` — [`VerifyIfscDto`](../request-response-dto-catalog.md#verify-ifsc-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyIfsc` at `apps/api/src/modules/digio/digio.controller.ts:345`; implementation: `apps/api/src/modules/digio/digio.service.ts:1994`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`VerifyIfscDto`](../request-response-dto-catalog.md#verify-ifsc-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:340` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:1994` — directly invoked service method.

## POST `/kyc/digio/bank/verify`

**Handler:** `DigioController.verifyBankAccount` — `apps/api/src/modules/digio/digio.controller.ts:348`

**Purpose:** Verify bank account via Digio Penny-Less / Penny-Drop

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyBankAccountDto` — [`VerifyBankAccountDto`](../request-response-dto-catalog.md#verify-bank-account-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyBankAccount` at `apps/api/src/modules/digio/digio.controller.ts:357`; implementation: `apps/api/src/modules/digio/digio.service.ts:2018`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VerifyBankAccountDto`](../request-response-dto-catalog.md#verify-bank-account-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:348` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2018` — directly invoked service method.

## POST `/kyc/digio/upi/verify`

**Handler:** `DigioController.verifyUpiVpa` — `apps/api/src/modules/digio/digio.controller.ts:360`

**Purpose:** Verify UPI VPA handle & registered holder name via Digio

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyUpiVpaDto` — [`VerifyUpiVpaDto`](../request-response-dto-catalog.md#verify-upi-vpa-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyUpiVpa` at `apps/api/src/modules/digio/digio.controller.ts:366`; implementation: `apps/api/src/modules/digio/digio.service.ts:2094`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VerifyUpiVpaDto`](../request-response-dto-catalog.md#verify-upi-vpa-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:360` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2094` — directly invoked service method.

## POST `/kyc/digio/upi/search`

**Handler:** `DigioController.searchUpiVpa` — `apps/api/src/modules/digio/digio.controller.ts:369`

**Purpose:** Search valid UPI handle suffixes via Digio

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: SearchUpiVpaDto` — [`SearchUpiVpaDto`](../request-response-dto-catalog.md#search-upi-vpa-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.searchUpiVpa` at `apps/api/src/modules/digio/digio.controller.ts:374`; implementation: `apps/api/src/modules/digio/digio.service.ts:2159`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`SearchUpiVpaDto`](../request-response-dto-catalog.md#search-upi-vpa-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:369` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2159` — directly invoked service method.

## POST `/kyc/digio/business/gst`

**Handler:** `DigioController.verifyGst` — `apps/api/src/modules/digio/digio.controller.ts:381`

**Purpose:** Verify GSTIN (standard or advanced) for corporate/vendor KYB

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyGstDto` — [`VerifyGstDto`](../request-response-dto-catalog.md#verify-gst-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyGst` at `apps/api/src/modules/digio/digio.controller.ts:387`; implementation: `apps/api/src/modules/digio/digio.service.ts:2169`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VerifyGstDto`](../request-response-dto-catalog.md#verify-gst-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:381` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2169` — directly invoked service method.

## POST `/kyc/digio/business/pan-to-gst`

**Handler:** `DigioController.verifyPanToGst` — `apps/api/src/modules/digio/digio.controller.ts:390`

**Purpose:** Discover all GSTINs registered against a company PAN

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyPanToGstDto` — [`VerifyPanToGstDto`](../request-response-dto-catalog.md#verify-pan-to-gst-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyPanToGst` at `apps/api/src/modules/digio/digio.controller.ts:399`; implementation: `apps/api/src/modules/digio/digio.service.ts:2234`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`VerifyPanToGstDto`](../request-response-dto-catalog.md#verify-pan-to-gst-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:390` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2234` — directly invoked service method.

## POST `/kyc/digio/business/cin`

**Handler:** `DigioController.verifyCin` — `apps/api/src/modules/digio/digio.controller.ts:402`

**Purpose:** Verify MCA Corporate Identification Number (CIN)

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyCinDto` — [`VerifyCinDto`](../request-response-dto-catalog.md#verify-cin-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyCin` at `apps/api/src/modules/digio/digio.controller.ts:408`; implementation: `apps/api/src/modules/digio/digio.service.ts:2272`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`VerifyCinDto`](../request-response-dto-catalog.md#verify-cin-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:402` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2272` — directly invoked service method.

## POST `/kyc/digio/business/din`

**Handler:** `DigioController.verifyDin` — `apps/api/src/modules/digio/digio.controller.ts:411`

**Purpose:** Verify MCA Director Identification Number (DIN)

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyDinDto` — [`VerifyDinDto`](../request-response-dto-catalog.md#verify-din-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyDin` at `apps/api/src/modules/digio/digio.controller.ts:417`; implementation: `apps/api/src/modules/digio/digio.service.ts:2315`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`VerifyDinDto`](../request-response-dto-catalog.md#verify-din-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:411` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2315` — directly invoked service method.

## POST `/kyc/digio/business/udyam`

**Handler:** `DigioController.verifyUdyam` — `apps/api/src/modules/digio/digio.controller.ts:420`

**Purpose:** Verify MSME Udyam registration certificate number

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyUdyamDto` — [`VerifyUdyamDto`](../request-response-dto-catalog.md#verify-udyam-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyUdyam` at `apps/api/src/modules/digio/digio.controller.ts:426`; implementation: `apps/api/src/modules/digio/digio.service.ts:2344`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`VerifyUdyamDto`](../request-response-dto-catalog.md#verify-udyam-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:420` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2344` — directly invoked service method.

## POST `/kyc/digio/business/fssai`

**Handler:** `DigioController.verifyFssai` — `apps/api/src/modules/digio/digio.controller.ts:429`

**Purpose:** Verify FSSAI business license

**Actor/access declaration:** Declared roles: `UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyFssaiDto` — [`VerifyFssaiDto`](../request-response-dto-catalog.md#verify-fssai-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyFssai` at `apps/api/src/modules/digio/digio.controller.ts:435`; implementation: `apps/api/src/modules/digio/digio.service.ts:2379`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`VerifyFssaiDto`](../request-response-dto-catalog.md#verify-fssai-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:429` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2379` — directly invoked service method.

## POST `/kyc/digio/fuzzy-match`

**Handler:** `DigioController.fuzzyMatch` — `apps/api/src/modules/digio/digio.controller.ts:442`

**Purpose:** Compare two names or addresses using Digio Fuzzy Match AI

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: FuzzyMatchDto` — [`FuzzyMatchDto`](../request-response-dto-catalog.md#fuzzy-match-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.fuzzyMatch` at `apps/api/src/modules/digio/digio.controller.ts:448`; implementation: `apps/api/src/modules/digio/digio.service.ts:2412`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`FuzzyMatchDto`](../request-response-dto-catalog.md#fuzzy-match-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:442` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2412` — directly invoked service method.

## POST `/kyc/digio/uan`

**Handler:** `DigioController.verifyUan` — `apps/api/src/modules/digio/digio.controller.ts:451`

**Purpose:** Verify EPFO UAN employment check (Admin only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: VerifyUanDto` — [`VerifyUanDto`](../request-response-dto-catalog.md#verify-uan-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.verifyUan` at `apps/api/src/modules/digio/digio.controller.ts:457`; implementation: `apps/api/src/modules/digio/digio.service.ts:2447`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`VerifyUanDto`](../request-response-dto-catalog.md#verify-uan-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:451` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2447` — directly invoked service method.

## POST `/kyc/digio/digilocker/request`

**Handler:** `DigioController.createDigilockerSession` — `apps/api/src/modules/digio/digio.controller.ts:464`

**Purpose:** Initiate a Digio DigiLocker KYC request + Gateway SDK token/URL

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: CreateDigilockerRequestDto` — [`CreateDigilockerRequestDto`](../request-response-dto-catalog.md#create-digilocker-request-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.createDigilockerSession` at `apps/api/src/modules/digio/digio.controller.ts:473`; implementation: `apps/api/src/modules/digio/digio.service.ts:2481`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateDigilockerRequestDto`](../request-response-dto-catalog.md#create-digilocker-request-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:464` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2481` — directly invoked service method.

## GET `/kyc/digio/digilocker/request/:requestId/status`

**Handler:** `DigioController.syncDigilockerStatus` — `apps/api/src/modules/digio/digio.controller.ts:476`

**Purpose:** Poll & sync DigiLocker KYC status from Digio API

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Param(requestId)` `requestId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.syncDigilockerResponse` at `apps/api/src/modules/digio/digio.controller.ts:484`; implementation: `apps/api/src/modules/digio/digio.service.ts:2568`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `digioVerification.findUnique`, `digioVerification.update`, `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:476` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2568` — directly invoked service method.

## POST `/kyc/digio/digilocker/request/:requestId/approval`

**Handler:** `DigioController.manageDigilockerApproval` — `apps/api/src/modules/digio/digio.controller.ts:487`

**Purpose:** Approve or reject a Digio KYC request manually (Admin)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Param(requestId)` `requestId: string`
- `@Body` `dto: ManageDigilockerApprovalDto` — [`ManageDigilockerApprovalDto`](../request-response-dto-catalog.md#manage-digilocker-approval-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.manageDigilockerApproval` at `apps/api/src/modules/digio/digio.controller.ts:497`; implementation: `apps/api/src/modules/digio/digio.service.ts:2764`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`ManageDigilockerApprovalDto`](../request-response-dto-catalog.md#manage-digilocker-approval-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:487` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2764` — directly invoked service method.

## POST `/kyc/digio/digilocker/request/:requestId/reattempt`

**Handler:** `DigioController.reattemptDigilocker` — `apps/api/src/modules/digio/digio.controller.ts:500`

**Purpose:** Allow user/admin to reattempt an incomplete Digio KYC flow

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Param(requestId)` `requestId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.reattemptDigilockerRequest` at `apps/api/src/modules/digio/digio.controller.ts:508`; implementation: `apps/api/src/modules/digio/digio.service.ts:2780`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `digioVerification.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:500` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2780` — directly invoked service method.

## POST `/kyc/digio/digilocker/request/:requestId/sync-media`

**Handler:** `DigioController.syncDigilockerMedia` — `apps/api/src/modules/digio/digio.controller.ts:511`

**Purpose:** Download DigiLocker verified documents (Aadhaar, DL, PAN, RC) & attach to Driver

**Actor/access declaration:** Declared roles: `UserRole.DRIVER, UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Param(requestId)` `requestId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.syncDigilockerMedia` at `apps/api/src/modules/digio/digio.controller.ts:520`; implementation: `apps/api/src/modules/digio/digio.service.ts:2803`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `digioVerification.findUnique`, `driver.findUnique`, `driver.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:511` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2803` — directly invoked service method.

## GET `/kyc/digio/admin/driver/:driverId`

**Handler:** `DigioController.getDriverVerifications` — `apps/api/src/modules/digio/digio.controller.ts:527`

**Purpose:** Get all Digio verification records for a driver (Admin)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(driverId)` `driverId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.getDriverVerificationsForAdmin` at `apps/api/src/modules/digio/digio.controller.ts:533`; implementation: `apps/api/src/modules/digio/digio.service.ts:935`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `digioVerification.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:527` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:935` — directly invoked service method.

## POST `/kyc/digio/admin/driver/:driverId/run-suite`

**Handler:** `DigioController.runDriverSuite` — `apps/api/src/modules/digio/digio.controller.ts:536`

**Purpose:** Run full Digio automated verification suite for a driver (Admin)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Param(driverId)` `driverId: string`
- `@Body` `dto: AdminRunDriverDigioSuiteDto` — [`AdminRunDriverDigioSuiteDto`](../request-response-dto-catalog.md#admin-run-driver-digio-suite-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.runAdminDriverSuite` at `apps/api/src/modules/digio/digio.controller.ts:546`; implementation: `apps/api/src/modules/digio/digio.service.ts:3021`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`AdminRunDriverDigioSuiteDto`](../request-response-dto-catalog.md#admin-run-driver-digio-suite-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:536` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:3021` — directly invoked service method.

## GET `/kyc/digio/admin/vendor/:vendorId`

**Handler:** `DigioController.getVendorVerifications` — `apps/api/src/modules/digio/digio.controller.ts:549`

**Purpose:** Get all Digio KYB verification records for a vendor/corporate (Admin)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(vendorId)` `vendorId: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.getVendorVerificationsForAdmin` at `apps/api/src/modules/digio/digio.controller.ts:555`; implementation: `apps/api/src/modules/digio/digio.service.ts:975`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `vendor.findUnique`, `digioVerification.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:549` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:975` — directly invoked service method.

## POST `/kyc/digio/webhooks`

**Handler:** `DigioController.handleWebhook` — `apps/api/src/modules/digio/digio.controller.ts:562`

**Purpose:** Receive Digio asynchronous KYC/KYB webhook events

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Req` `req: RawBodyRequest<Request>`
- `@Headers(x-digio-checksum)` `checksum: string | undefined`
- `@Body` `payload: any` — `any`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `DigioService.handleWebhook` at `apps/api/src/modules/digio/digio.controller.ts:577`; implementation: `apps/api/src/modules/digio/digio.service.ts:2946`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `UnauthorizedException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/digio/digio.controller.ts:562` — route decorator and handler.
- `apps/api/src/modules/digio/digio.service.ts:2946` — directly invoked service method.
