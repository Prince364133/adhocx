---
title: NotificationsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for NotificationsController.
status: partial
last_reviewed: "2026-11-23"
---

# NotificationsController Endpoint Reference

**Stable controller ID:** `API-CTRL-NOTIFICATIONS`  
**Controller source:** `apps/api/src/modules/notifications/notifications.controller.ts:32`  
**Nest route prefix:** `notifications`  
**Swagger tags:** `Realtime & Notifications`  
**Route methods:** 17; **decorated path variants:** 17

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/notifications/device-token`

**Handler:** `NotificationsController.registerDeviceToken` — `apps/api/src/modules/notifications/notifications.controller.ts:80`

**Purpose:** Register or update FCM device token for current user

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: RegisterDeviceTokenDto` — [`RegisterDeviceTokenDto`](../request-response-dto-catalog.md#register-device-token-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.registerDeviceToken` at `apps/api/src/modules/notifications/notifications.controller.ts:90`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:659`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findUnique`, `deviceToken.findUnique`, `deviceToken.update`, `deviceToken.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`RegisterDeviceTokenDto`](../request-response-dto-catalog.md#register-device-token-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:80` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:659` — directly invoked service method.

## DELETE `/notifications/device-token`

**Handler:** `NotificationsController.unregisterDeviceToken` — `apps/api/src/modules/notifications/notifications.controller.ts:93`

**Purpose:** Unregister device FCM token upon logout

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- `@Body` `dto: UnregisterDeviceTokenDto` — [`UnregisterDeviceTokenDto`](../request-response-dto-catalog.md#unregister-device-token-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.unregisterDeviceToken` at `apps/api/src/modules/notifications/notifications.controller.ts:98`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:720`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `deviceToken.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UnregisterDeviceTokenDto`](../request-response-dto-catalog.md#unregister-device-token-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:93` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:720` — directly invoked service method.

## GET `/notifications/preferences`

**Handler:** `NotificationsController.getPreferences` — `apps/api/src/modules/notifications/notifications.controller.ts:103`

**Purpose:** Get current user notification delivery preferences

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.getPreferences` at `apps/api/src/modules/notifications/notifications.controller.ts:110`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:1941`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `notificationPreference.findUnique`, `notificationPreference.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:103` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:1941` — directly invoked service method.

## PATCH `/notifications/preferences`

**Handler:** `NotificationsController.updatePreferences` — `apps/api/src/modules/notifications/notifications.controller.ts:113`

**Purpose:** Update user notification channel and quiet hours preferences

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Body` `dto: UpdateNotificationPreferenceDto` — [`UpdateNotificationPreferenceDto`](../request-response-dto-catalog.md#update-notification-preference-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.updatePreferences` at `apps/api/src/modules/notifications/notifications.controller.ts:123`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:1975`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `notificationPreference.upsert`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`UpdateNotificationPreferenceDto`](../request-response-dto-catalog.md#update-notification-preference-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:113` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:1975` — directly invoked service method.

## GET `/notifications/in-app`

**Handler:** `NotificationsController.getInAppNotifications` — `apps/api/src/modules/notifications/notifications.controller.ts:128`

**Purpose:** Get in-app notifications feed with unread counter for current user

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Query(page)` `page: number` — `number`
- `@Query(limit)` `limit: number` — `number`
- `@Query(unreadOnly)` `unreadOnly: boolean` — `boolean`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.getUserNotifications` at `apps/api/src/modules/notifications/notifications.controller.ts:141`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:2010`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `notification.findMany`, `notification.count`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `number`, `number`, `boolean`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:128` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:2010` — directly invoked service method.

## PATCH `/notifications/in-app/:id/read`

**Handler:** `NotificationsController.markAsRead` — `apps/api/src/modules/notifications/notifications.controller.ts:148`

**Purpose:** Mark individual in-app notification as read

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Param(id)` `id: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.markAsRead` at `apps/api/src/modules/notifications/notifications.controller.ts:153`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:2063`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `notification.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:148` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:2063` — directly invoked service method.

## POST `/notifications/in-app/:id/interact`

**Handler:** `NotificationsController.trackInteraction` — `apps/api/src/modules/notifications/notifications.controller.ts:156`

**Purpose:** Track user interaction (click/open) on notification

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Param(id)` `id: string`
- `@Body` `_dto: NotificationInteractionDto` — [`NotificationInteractionDto`](../request-response-dto-catalog.md#notification-interaction-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.trackInteraction` at `apps/api/src/modules/notifications/notifications.controller.ts:167`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:2079`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `notification.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`NotificationInteractionDto`](../request-response-dto-catalog.md#notification-interaction-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:156` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:2079` — directly invoked service method.

## PATCH `/notifications/in-app/read-all`

**Handler:** `NotificationsController.markAllAsRead` — `apps/api/src/modules/notifications/notifications.controller.ts:170`

**Purpose:** Mark all in-app notifications as read for current user

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.markAllAsRead` at `apps/api/src/modules/notifications/notifications.controller.ts:177`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:2091`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `notification.updateMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:170` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:2091` — directly invoked service method.

## DELETE `/notifications/in-app`

**Handler:** `NotificationsController.clearAllInAppNotifications` — `apps/api/src/modules/notifications/notifications.controller.ts:180`

**Purpose:** Clear all in-app notifications for current user

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.clearAllNotifications` at `apps/api/src/modules/notifications/notifications.controller.ts:185`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:2127`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `notification.deleteMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:180` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:2127` — directly invoked service method.

## DELETE `/notifications/in-app/:id`

**Handler:** `NotificationsController.deleteInAppNotification` — `apps/api/src/modules/notifications/notifications.controller.ts:188`

**Purpose:** Delete a single in-app notification for current user

**Actor/access declaration:** JWT guard declared; no explicit `@Roles` declaration at this handler/controller.

**Guards:** `JwtAuthGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Param(id)` `id: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.deleteNotification` at `apps/api/src/modules/notifications/notifications.controller.ts:198`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:2103`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `notification.count`, `notification.deleteMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:188` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:2103` — directly invoked service method.

## POST `/notifications/admin/broadcast`

**Handler:** `NotificationsController.broadcastPush` — `apps/api/src/modules/notifications/notifications.controller.ts:203`

**Purpose:** Dispatch broadcast push notification to filtered audience (Admin Only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- Authenticated user identity is injected by `@CurrentUser` (`AuthUserDto`); it is not caller-supplied payload.
- `@Headers(x-notification-operation-id)` `operationId: string | undefined`
- `@Body` `dto: BroadcastPushDto` — [`BroadcastPushDto`](../request-response-dto-catalog.md#broadcast-push-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.broadcastPush` at `apps/api/src/modules/notifications/notifications.controller.ts:216`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:1354`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- Body/query types: [`BroadcastPushDto`](../request-response-dto-catalog.md#broadcast-push-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:203` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:1354` — directly invoked service method.

## GET `/notifications/admin/broadcast-progress/:id`

**Handler:** `NotificationsController.getBroadcastProgress` — `apps/api/src/modules/notifications/notifications.controller.ts:223`

**Purpose:** Get live progress and per-recipient results for a broadcast

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id, new ParseUUIDPipe())` `id: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.getBroadcastProgress` at `apps/api/src/modules/notifications/notifications.controller.ts:233`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:507`.

**Direct persistence evidence:**
- No direct Prisma model delegate was found in the first directly called service method; deeper helpers, repositories, providers or in-memory behavior may still be involved.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:223` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:507` — directly invoked service method.

## POST `/notifications/admin/audience-estimate`

**Handler:** `NotificationsController.estimateAudience` — `apps/api/src/modules/notifications/notifications.controller.ts:236`

**Purpose:** Calculate estimated audience reach for given filters (Admin Only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Body` `filter: AudienceFilterDto` — [`AudienceFilterDto`](../request-response-dto-catalog.md#audience-filter-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.estimateAudience` at `apps/api/src/modules/notifications/notifications.controller.ts:245`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:1305`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`AudienceFilterDto`](../request-response-dto-catalog.md#audience-filter-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:236` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:1305` — directly invoked service method.

## POST `/notifications/admin/test-push`

**Handler:** `NotificationsController.sendTestPush` — `apps/api/src/modules/notifications/notifications.controller.ts:248`

**Purpose:** Send instant test push notification to specific token or user (Admin Only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Body` `dto: TestPushDto` — [`TestPushDto`](../request-response-dto-catalog.md#test-push-dto)

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.sendTestPush` at `apps/api/src/modules/notifications/notifications.controller.ts:257`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:1879`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `user.findFirst`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`TestPushDto`](../request-response-dto-catalog.md#test-push-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `NotFoundException`, `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:248` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:1879` — directly invoked service method.

## GET `/notifications/admin/campaigns`

**Handler:** `NotificationsController.getCampaigns` — `apps/api/src/modules/notifications/notifications.controller.ts:260`

**Purpose:** List push notification broadcast campaign history (Admin Only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(page)` `page: number` — `number`
- `@Query(limit)` `limit: number` — `number`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.getCampaigns` at `apps/api/src/modules/notifications/notifications.controller.ts:271`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:2182`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `notificationCampaign.findMany`, `notificationCampaign.count`, `notificationCampaignRecipient.groupBy`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `number`, `number`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:260` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:2182` — directly invoked service method.

## GET `/notifications/admin/campaigns/:id/recipients`

**Handler:** `NotificationsController.getCampaignRecipients` — `apps/api/src/modules/notifications/notifications.controller.ts:277`

**Purpose:** Get recipient-level delivery results for an admin campaign

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Param(id, new ParseUUIDPipe())` `id: string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.getCampaignRecipients` at `apps/api/src/modules/notifications/notifications.controller.ts:285`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:2309`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `notificationCampaign.findUnique`, `notificationCampaignRecipient.findMany`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- Exception types found in the handler or first directly called service method: `BadRequestException`, `NotFoundException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:277` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:2309` — directly invoked service method.

## GET `/notifications/admin/metrics`

**Handler:** `NotificationsController.getMetrics` — `apps/api/src/modules/notifications/notifications.controller.ts:288`

**Purpose:** Get overall push notification and device telemetry metrics (Admin Only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- No request body, query, path, header or injected-user parameter is declared in the method signature.

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `NotificationsService.getMetrics` at `apps/api/src/modules/notifications/notifications.controller.ts:297`; implementation: `apps/api/src/modules/notifications/notifications.service.ts:2417`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `notificationCampaign.count`, `deviceToken.findMany`, `notification.count`, `notificationCampaignRecipient.groupBy`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- No body/query DTO appears in the method signature.
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/notifications/notifications.controller.ts:288` — route decorator and handler.
- `apps/api/src/modules/notifications/notifications.service.ts:2417` — directly invoked service method.
