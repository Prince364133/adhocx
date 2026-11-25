---
title: CorporatePayoutWebhookController Endpoint Reference
description: Source-traced route inputs, access declarations and handler delegation for CorporatePayoutWebhookController.
status: partial
last_reviewed: "2026-11-23"
---

# CorporatePayoutWebhookController Endpoint Reference

**Stable controller ID:** `API-CTRL-CORPORATE-PAYOUT-WEBHOOK`  
**Controller source:** `apps/api/src/domains/corporate/billing/corporate-payout-webhook.controller.ts:11`  
**Nest route prefix:** `corporate/billing`  
**Swagger tags:** `Corporate ETS - Payout Provider Callback`  
**Route methods:** 1; **decorated path variants:** 1

This page reports declarations in the controller and the first directly called service method. It is not a runtime test. The default global prefix is `/api/v1`; `apps/api/src/main.ts` excludes selected paths and some decorators contain an explicit `api/v1` segment. The **declared controller path** below must not be blindly treated as a confirmed deployed URL.

Shared response and validation behavior is described in [API conventions](../api-conventions.md). Referenced DTO properties and validators are listed in the [request/response DTO catalog](../request-response-dto-catalog.md); error handling is summarized in the [error catalog](../error-code-catalog.md).

## POST `/corporate/billing/payouts/provider-callback`

**Handler:** `CorporatePayoutWebhookController.providerCallback` — `apps/api/src/domains/corporate/billing/corporate-payout-webhook.controller.ts:16`

**Purpose:** Signed payout provider confirmation (PAID / FAILED / REVERSED)

**Actor/access declaration:** No JWT/role guard declaration found on this handler/controller; other global or provider-level checks are not ruled out.

**Request inputs:**
- `@Req` `req: any`
- `@Body` `body: any` — `any`
- `@Headers(PAYOUT_SIGNATURE_HEADER)` `signature: string`

**Success response declaration:**
- status `200` — Accepted (or replay ignored)
- status `401` — Missing or invalid signature

**Controller → service:**
- Calls `CorporatePayoutService.handleProviderCallback` at `apps/api/src/domains/corporate/billing/corporate-payout-webhook.controller.ts:29`; implementation: `apps/api/src/domains/corporate/billing/corporate-payout.service.ts:212`.

**Direct persistence evidence:**
- Prisma delegate references in directly called service methods: `corporatePayoutProviderEvent.findUnique`, `corporatePayout.findUnique`, `corporatePayout.findFirst`, `corporatePayoutProviderEvent.create`. This static scan does not recursively expand helper calls.

**Validation and explicit errors:**
- Body/query types: `any`. Concrete DTO classes are subject to the global validation pipe; see the catalog and [API conventions](../api-conventions.md).
- Exception types found in the handler or first directly called service method: `BadRequestException`.
- Standard error serialization is handled by the global exception filter; see the [error catalog](../error-code-catalog.md).

**Coverage status:** Partial — route declaration and first-level handler/service evidence are recorded; complete business rules, downstream call graph, runtime response examples and tests may remain.

**Evidence:**
- `apps/api/src/domains/corporate/billing/corporate-payout-webhook.controller.ts:16` — route decorator and handler.
- `apps/api/src/domains/corporate/billing/corporate-payout.service.ts:212` — directly invoked service method.
