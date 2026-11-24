---
title: AuthController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for AuthController.
status: partial
last_reviewed: "2026-11-23"
---

# AuthController Endpoint Reference

**Stable controller ID:** `API-CTRL-AUTH`  
**Controller source:** `apps/api/src/modules/auth/auth.controller.ts:18`  
**Nest route prefix:** `auth`  
**Swagger tags:** `Authentication`  
**Route methods:** 16; **decorated path variants:** 18

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/auth/admin/login`

**Handler:** `AuthController.adminLogin` — `apps/api/src/modules/auth/auth.controller.ts:23`

**Purpose:** Authenticate Administrator using Admin ID/Email and Password (with MFA challenge)

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Body` `dto: LoginDto & { mfaCode?: string }` — [`LoginDto & { mfaCode?: string }`](../request-response-dto-catalog.md#login-dto)

**Success response declaration:**
- status `200` — Admin authentication or MFA challenge returned

**Controller → service:**
- Calls `AuthService.adminLogin` at `apps/api/src/modules/auth/auth.controller.ts:28`; implementation: `apps/api/src/modules/auth/auth.service.ts:227`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`LoginDto & { mfaCode?: string }`](../request-response-dto-catalog.md#login-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `UnauthorizedException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:23` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:227` — directly invoked service method.

## POST `/auth/admin/mfa-verify`

**Handler:** `AuthController.adminMfaVerify` — `apps/api/src/modules/auth/auth.controller.ts:31`

**Purpose:** Verify Admin Multi-Factor Authentication (MFA) challenge code

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Body` `dto: { mfaSessionToken: string; mfaCode: string }` — `{ mfaSessionToken: string; mfaCode: string }`

**Success response declaration:**
- status `200` — MFA verified, administrative JWT tokens returned

**Controller → service:**
- Calls `AuthService.adminMfaVerify` at `apps/api/src/modules/auth/auth.controller.ts:36`; implementation: `apps/api/src/modules/auth/auth.service.ts:290`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `{ mfaSessionToken: string; mfaCode: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `UnauthorizedException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:31` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:290` — directly invoked service method.

## GET `/auth/admin/verify`

**Handler:** `AuthController.verifyAdminSession` — `apps/api/src/modules/auth/auth.controller.ts:39`

**Purpose:** Verify active administrative session and credentials

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — Administrative session is valid

**Controller → service:**
- Calls `AuthService.verifyAdminSession` at `apps/api/src/modules/auth/auth.controller.ts:46`; implementation: `apps/api/src/modules/auth/auth.service.ts:330`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:39` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:330` — directly invoked service method.

## POST `/auth/login`

**Handler:** `AuthController.login` — `apps/api/src/modules/auth/auth.controller.ts:49`

**Purpose:** Authenticate user using Mobile Number / Email and Password

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Body` `dto: LoginDto` — [`LoginDto`](../request-response-dto-catalog.md#login-dto)

**Success response declaration:**
- status `200` — Authentication successful, JWT tokens returned

**Controller → service:**
- Calls `AuthService.login` at `apps/api/src/modules/auth/auth.controller.ts:54`; implementation: `apps/api/src/modules/auth/auth.service.ts:354`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`LoginDto`](../request-response-dto-catalog.md#login-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `UnauthorizedException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:49` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:354` — directly invoked service method.

## POST `/auth/otp/request`

**Handler:** `AuthController.requestOtp` — `apps/api/src/modules/auth/auth.controller.ts:57`

**Purpose:** Request OTP for Mobile Number or Email Address

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Body` `dto: RequestOtpDto` — [`RequestOtpDto`](../request-response-dto-catalog.md#request-otp-dto)

**Success response declaration:**
- status `200` — OTP requested and dispatched via notification service

**Controller → service:**
- Calls `AuthService.requestOtp` at `apps/api/src/modules/auth/auth.controller.ts:62`; implementation: `apps/api/src/modules/auth/auth.service.ts:468`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findFirst`, `corporateTenant.findFirst`, `user.create`, `corporateEmployee.findFirst`, `user.findUnique`, `corporateEmployee.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`RequestOtpDto`](../request-response-dto-catalog.md#request-otp-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `ConflictException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:57` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:468` — directly invoked service method.

## POST `/auth/otp/verify`

**Handler:** `AuthController.verifyOtp` — `apps/api/src/modules/auth/auth.controller.ts:65`

**Purpose:** Verify OTP and obtain JWT tokens

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Body` `dto: VerifyOtpDto` — [`VerifyOtpDto`](../request-response-dto-catalog.md#verify-otp-dto)

**Success response declaration:**
- status `200` — Authentication successful

**Controller → service:**
- Calls `AuthService.verifyOtp` at `apps/api/src/modules/auth/auth.controller.ts:70`; implementation: `apps/api/src/modules/auth/auth.service.ts:698`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findFirst`, `user.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`VerifyOtpDto`](../request-response-dto-catalog.md#verify-otp-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`, `UnauthorizedException`, `ConflictException`, `ForbiddenException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:65` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:698` — directly invoked service method.

## GET `/auth/check-phone`

**Handler:** `AuthController.checkPhone` — `apps/api/src/modules/auth/auth.controller.ts:73`

**Purpose:** Check if a mobile number is available and unique for registration

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Query(phone)` `phone: string` — `string`
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Phone availability check result

**Controller → service:**
- Calls `AuthService.checkPhoneAvailability` at `apps/api/src/modules/auth/auth.controller.ts:83`; implementation: `apps/api/src/modules/auth/auth.service.ts:1949`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:73` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:1949` — directly invoked service method.

## POST `/auth/check-phone`

**Handler:** `AuthController.checkPhonePost` — `apps/api/src/modules/auth/auth.controller.ts:86`

**Purpose:** Check if a mobile number is available and unique for registration

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Body` `dto: { phone: string }` — `{ phone: string }`
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Phone availability check result

**Controller → service:**
- Calls `AuthService.checkPhoneAvailability` at `apps/api/src/modules/auth/auth.controller.ts:96`; implementation: `apps/api/src/modules/auth/auth.service.ts:1949`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: `{ phone: string }`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:86` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:1949` — directly invoked service method.

## POST `/auth/social`

**Handler:** `AuthController.socialAuth` — `apps/api/src/modules/auth/auth.controller.ts:99`

**Purpose:** Google / Apple Social Authentication with pre-verified email (Skips OTP)

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Body` `dto: SocialAuthDto` — [`SocialAuthDto`](../request-response-dto-catalog.md#social-auth-dto)

**Success response declaration:**
- status `200` — Social login successful, tokens returned

**Controller → service:**
- Calls `AuthService.socialAuth` at `apps/api/src/modules/auth/auth.controller.ts:104`; implementation: `apps/api/src/modules/auth/auth.service.ts:949`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findFirst`, `user.create`, `vendor.create`, `driver.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`SocialAuthDto`](../request-response-dto-catalog.md#social-auth-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `UnauthorizedException`, `ForbiddenException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:99` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:949` — directly invoked service method.

## POST `/auth/password`

**Handler:** `AuthController.setPassword` — `apps/api/src/modules/auth/auth.controller.ts:107`

**Purpose:** Set or update user password

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: SetPasswordDto` — [`SetPasswordDto`](../request-response-dto-catalog.md#set-password-dto)

**Success response declaration:**
- status `200` — Password updated successfully

**Controller → service:**
- Calls `AuthService.setPassword` at `apps/api/src/modules/auth/auth.controller.ts:114`; implementation: `apps/api/src/modules/auth/auth.service.ts:1134`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`SetPasswordDto`](../request-response-dto-catalog.md#set-password-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:107` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:1134` — directly invoked service method.

## POST `/auth/password/reset` / `/auth/reset-password`

**Handler:** `AuthController.resetPassword` — `apps/api/src/modules/auth/auth.controller.ts:117`

**Purpose:** Reset user password using verified OTP

**Alias group:** These 2 decorated paths share this handler: `/auth/password/reset`, `/auth/reset-password`.

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Body` `dto: ResetPasswordDto` — [`ResetPasswordDto`](../request-response-dto-catalog.md#reset-password-dto)

**Success response declaration:**
- status `200` — Password reset successfully

**Controller → service:**
- Calls `AuthService.resetPassword` at `apps/api/src/modules/auth/auth.controller.ts:122`; implementation: `apps/api/src/modules/auth/auth.service.ts:1190`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findFirst`, `user.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`ResetPasswordDto`](../request-response-dto-catalog.md#reset-password-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `UnauthorizedException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:117` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:1190` — directly invoked service method.

## POST `/auth/refresh` / `/auth/refresh-token`

**Handler:** `AuthController.refresh` — `apps/api/src/modules/auth/auth.controller.ts:125`

**Purpose:** Refresh access token using refresh token

**Alias group:** These 2 decorated paths share this handler: `/auth/refresh`, `/auth/refresh-token`.

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Body` `dto: RefreshTokenDto` — [`RefreshTokenDto`](../request-response-dto-catalog.md#refresh-token-dto)

**Success response declaration:**
- status `200` — Tokens refreshed successfully

**Controller → service:**
- Calls `AuthService.refreshToken` at `apps/api/src/modules/auth/auth.controller.ts:130`; implementation: `apps/api/src/modules/auth/auth.service.ts:1576`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`RefreshTokenDto`](../request-response-dto-catalog.md#refresh-token-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `UnauthorizedException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:125` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:1576` — directly invoked service method.

## GET `/auth/me`

**Handler:** `AuthController.getMe` — `apps/api/src/modules/auth/auth.controller.ts:133`

**Purpose:** Get current authenticated user profile

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — User profile retrieved

**Controller → service:**
- Calls `AuthService.getCurrentUser` at `apps/api/src/modules/auth/auth.controller.ts:139`; implementation: `apps/api/src/modules/auth/auth.service.ts:1738`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`, `user.update`, `driver.update`, `vendor.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:133` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:1738` — directly invoked service method.

## PATCH `/auth/profile`

**Handler:** `AuthController.updateProfile` — `apps/api/src/modules/auth/auth.controller.ts:142`

**Purpose:** Update current authenticated user profile details

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: UpdateUserDto` — [`UpdateUserDto`](../request-response-dto-catalog.md#update-user-dto)

**Success response declaration:**
- status `200` — User profile updated successfully

**Controller → service:**
- Calls `AuthService.updateUserProfile` at `apps/api/src/modules/auth/auth.controller.ts:151`; implementation: `apps/api/src/modules/auth/auth.service.ts:1871`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`, `user.update`, `driver.update`, `vendor.update`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateUserDto`](../request-response-dto-catalog.md#update-user-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `ConflictException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:142` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:1871` — directly invoked service method.

## POST `/auth/logout`

**Handler:** `AuthController.logout` — `apps/api/src/modules/auth/auth.controller.ts:154`

**Purpose:** Log out and invalidate current session token

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- `@Req` `req: any`
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- status `200` — Logged out successfully

**Controller → service:**
- Calls `AuthService.logout` at `apps/api/src/modules/auth/auth.controller.ts:163`; implementation: `apps/api/src/modules/auth/auth.service.ts:1424`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `driver.findUnique`, `trip.findFirst`, `driver.update`, `offer.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:154` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:1424` — directly invoked service method.

## DELETE `/auth/account`

**Handler:** `AuthController.deleteAccount` — `apps/api/src/modules/auth/auth.controller.ts:167`

**Purpose:** Permanently delete user account and all data from database

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Req` `req: any`

**Success response declaration:**
- status `200` — Account permanently deleted from database

**Controller → service:**
- Calls `AuthService.deleteAccount` at `apps/api/src/modules/auth/auth.controller.ts:176`; implementation: `apps/api/src/modules/auth/auth.service.ts:1492`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`, `settlement.deleteMany`, `trip.deleteMany`, `assignment.deleteMany`, `offer.deleteMany`, `vehicle.deleteMany`, `driver.delete`, `payment.deleteMany`, `requirement.deleteMany`, `vendor.delete`, `corporateEmployee.updateMany`, `deviceToken.deleteMany`, `notification.deleteMany`, `notificationPreference.deleteMany`, `couponRedemption.deleteMany`, `review.deleteMany`, `dispute.deleteMany`, `auditLog.deleteMany`, `user.delete`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/auth/auth.controller.ts:167` — route decorator and handler.
- `apps/api/src/modules/auth/auth.service.ts:1492` — directly invoked service method.
