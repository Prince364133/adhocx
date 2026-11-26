---
title: Webhooks and Idempotency
description: Source-verified webhook authentication, replay handling and idempotency behavior in the AdhocX API.
status: partial
last_reviewed: "2026-11-23"
---

# Webhooks and Idempotency

Webhook handlers are server-to-server routes. Their authentication and replay
behavior is specific to each integration; a shared JWT guard or universal
idempotency header is not assumed.

## Webhook endpoints

| Integration | Controller route declaration | Authentication | Processing and persistence | Status |
|---|---|---|---|---|
| Payment provider | `POST /payments/webhooks/:provider` | No JWT/role decorator is declared on this handler. Service validates `x-razorpay-signature` as HMAC-SHA256 or accepts `x-webhook-secret`; comparison uses a constant-time helper. | Payment events may update `Payment`, write audit records, emit vendor notifications, or credit a vendor wallet through the wallet-top-up flow. The controller passes the parsed request body; the service signs `JSON.stringify(payload)`, not an explicitly supplied raw-body buffer. | Partial — provider-specific delivery, retry and dedupe guarantees require provider-specific verification |
| DigiO KYC/KYB | `POST /kyc/digio/webhooks` | `x-digio-checksum` is checked against an HMAC-SHA256 of the raw request body when `DIGIO_WEBHOOK_SECRET` is configured. In production without the secret, the service acknowledges but ignores the event. Outside production, the IP allow-list is advisory/logging behavior. | Accepts at-least-once delivery, uses a 24-hour Redis `SET NX` claim by event ID when Redis is available, then schedules a background reconciliation against DigiO's API. Webhook fields are not treated as authoritative. | Partial — Redis-unavailable behavior falls back to processing; reconciliation results are authoritative |
| Corporate payout provider | `POST /corporate/billing/payouts/provider-callback` | No JWT/role guard is declared. `x-adhocx-signature` must contain the HMAC-SHA256 of the exact raw body, checked with a timing-safe comparison using `CORPORATE_PAYOUT_WEBHOOK_SECRET`. | Verifies and deduplicates provider events by provider plus event ID, then applies confirmation to a payout and records `CorporatePayoutProviderEvent`. This callback is the only path that marks a payout `PAID`. | Source-traced; validate deployed provider configuration separately |

All secret names above are configuration identifiers only; never place their
values in documentation, client code or example commands.

### Payment webhook notes

`PaymentsController` forwards the provider path parameter and the selected
signature header to `PaymentsService.handleWebhook`. The service currently
does not use its provider parameter to select provider-specific verification
logic. It accepts a configured webhook secret, determines success from
recognized event/status fields, and handles either a wallet top-up or a
payment-ID update. The handler does not declare a general event-ID replay
table; wallet/payment-specific safeguards must be checked in the respective
service paths before assuming retries are harmless.

### DigiO webhook notes

`DigioController` reads `req.rawBody`, the checksum header and the forwarded
or socket IP, then calls `DigioService.handleWebhook`. If a webhook ID has
already been claimed, the service acknowledges it as a duplicate. With no
Redis client, the claim helper returns true and relies on reconciliation
being idempotent. A webhook with no request identifier is acknowledged
without scheduling reconciliation.

### Corporate payout callback notes

`main.ts` enables raw-body capture; the controller uses that exact byte
sequence for signature verification. A
replayed provider event is acknowledged without reapplying its financial
effect; concurrent duplicate insertion is also handled through the database
unique constraint path. See the [Corporate payout controller reference](./endpoints/corporate-payout-webhook-controller.md).

## Idempotency mechanisms

| Operation | Key and scope | Duplicate behavior | Evidence |
|---|---|---|---|
| Corporate payout batch creation | `idempotencyKey` in body or `Idempotency-Key` header; 8–64 characters when supplied | Service checks the unique batch key and uses transaction/database uniqueness to prevent duplicate batches. If omitted, the service generates a key; clients should supply a stable key when retrying the same request. | `corporate-billing.controller.ts`, `corporate-billing.service.ts`, `CorporatePayoutBatch` schema |
| Corporate support ticket creation | `idempotency-key` header; unique key is checked against tenant, and employee callers must match the original raiser | Controller checks for a prior ticket before storing attachments; the service rejects a reused key that conflicts with tenant/employee ownership. | `corporate-support-ticket.controller.ts`, `corporate-support-ticket.service.ts` |
| Corporate roster publication | Per-entry `idempotencyHash` | `createMany(skipDuplicates)` and a unique hash prevent re-publishing the same roster demand line from creating duplicates. | `roster-ingestion.service.ts`, `roster-lifecycle.service.ts` |
| Notification dispatch | Optional `idempotencyKey`, default 120-second window | Redis is used when available; on Redis failure or absence, an in-memory sliding-window cache is used. This is process-local fallback, not a durable cross-instance guarantee. | `notification-queue.service.ts`, `notifications.service.ts` |
| Vendor quote booking | Quote ID is used as the retry key | The controller comment documents repeated submissions of the same quote ID as returning the existing booking. | `vendor-quote.controller.ts`, `vendor-quote.service.ts` |

These mechanisms are route/workflow-specific. Do not send an idempotency key
to an unrelated API and assume it is honored.

## Safe retry guidance

- Reuse the same key only when retrying the same logical operation with the
  same business payload.
- Do not retry irreversible finance actions based only on a timeout; first
  inspect the operation's status or reconciliation endpoint.
- Preserve webhook event IDs and provider references when retrying delivery.
- A webhook acknowledgement does not always mean its downstream
  reconciliation has completed.

## Sources and verification

- `apps/api/src/modules/payments/payments.controller.ts`, `payments.service.ts` — payment webhook signature and payment/wallet effects.
- `apps/api/src/modules/digio/digio.controller.ts`, `digio.service.ts`, `digio.client.ts` — raw-body checksum, deduplication and reconciliation.
- `apps/api/src/domains/corporate/billing/corporate-payout-webhook.controller.ts`, `corporate-payout.service.ts` — signed payout callback and event deduplication.
- `apps/api/src/domains/corporate/safety/corporate-support-ticket.controller.ts`, `corporate-support-ticket.service.ts` — support ticket idempotency.
- `apps/api/src/domains/corporate/rosters/` — roster demand idempotency.
- `apps/api/src/modules/notifications/notification-queue.service.ts` — Redis and in-memory dedupe behavior.
