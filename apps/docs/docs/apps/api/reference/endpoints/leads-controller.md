---
title: LeadsController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for LeadsController.
status: partial
last_reviewed: "2026-11-23"
---

# LeadsController Endpoint Reference

**Stable controller ID:** `API-CTRL-LEADS`  
**Controller source:** `apps/api/src/modules/leads/leads.controller.ts:8`  
**Nest route prefix:** `leads`  
**Swagger tags:** `Marketing & Leads`  
**Route methods:** 3; **decorated path variants:** 3

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/leads/enterprise`

**Handler:** `LeadsController.createEnterpriseLead` — `apps/api/src/modules/leads/leads.controller.ts:13`

**Purpose:** Submit corporate enterprise fleet demo inquiry (Public)

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Body` `dto: CreateEnterpriseLeadDto` — [`CreateEnterpriseLeadDto`](../request-response-dto-catalog.md#create-enterprise-lead-dto)

**Success response declaration:**
- status `201` — Lead successfully captured in database

**Controller → service:**
- Calls `LeadsService.createEnterpriseLead` at `apps/api/src/modules/leads/leads.controller.ts:17`; implementation: `apps/api/src/modules/leads/leads.service.ts:14`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `leadCapture.create`, `auditLog.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`CreateEnterpriseLeadDto`](../request-response-dto-catalog.md#create-enterprise-lead-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/leads/leads.controller.ts:13` — route decorator and handler.
- `apps/api/src/modules/leads/leads.service.ts:14` — directly invoked service method.

## POST `/leads/newsletter`

**Handler:** `LeadsController.subscribeNewsletter` — `apps/api/src/modules/leads/leads.controller.ts:20`

**Purpose:** Subscribe email to AdhocX Fleet Dispatch newsletter (Public)

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Body` `dto: SubscribeNewsletterDto` — [`SubscribeNewsletterDto`](../request-response-dto-catalog.md#subscribe-newsletter-dto)

**Success response declaration:**
- status `201` — Newsletter subscription confirmed

**Controller → service:**
- Calls `LeadsService.subscribeNewsletter` at `apps/api/src/modules/leads/leads.controller.ts:24`; implementation: `apps/api/src/modules/leads/leads.service.ts:68`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `leadCapture.findFirst`, `leadCapture.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: [`SubscribeNewsletterDto`](../request-response-dto-catalog.md#subscribe-newsletter-dto). Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/leads/leads.controller.ts:20` — route decorator and handler.
- `apps/api/src/modules/leads/leads.service.ts:68` — directly invoked service method.

## GET `/leads`

**Handler:** `LeadsController.listLeads` — `apps/api/src/modules/leads/leads.controller.ts:27`

**Purpose:** List all captured enterprise leads and newsletter subscribers (Admin Only)

**Actor/access declaration:** Declared roles: `UserRole.ADMIN`

**Guards:** `JwtAuthGuard, RolesGuard`.

**Request inputs:**
- `@Query(type)` `type: string` — `string`
- `@Query(status)` `status: string` — `string`
- `@Query(page)` `page: string` — `string`
- `@Query(limit)` `limit: string` — `string`

**Success response declaration:**
- No `@ApiResponse` or explicit method return type is declared; inspect the handler/service implementation for the returned value.

**Controller → service:**
- Calls `LeadsService.listLeads` at `apps/api/src/modules/leads/leads.controller.ts:42`; implementation: `apps/api/src/modules/leads/leads.service.ts:106`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `leadCapture.findMany`, `leadCapture.count`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `string`, `string`, `string`, `string`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- No direct `throw new ...Exception/Error` was found in the handler or first directly called service method; deeper helpers and providers can still fail.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/modules/leads/leads.controller.ts:27` — route decorator and handler.
- `apps/api/src/modules/leads/leads.service.ts:106` — directly invoked service method.
