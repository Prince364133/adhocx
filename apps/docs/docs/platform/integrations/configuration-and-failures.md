---
title: Integration Configuration and Failures
description: Environment boundaries and failure handling for third-party services.
---

# Integration Configuration and Failures

**Evidence status:** Verified against configuration modules and adapter source.

## Configuration Categories

| Category | Example variables |
|---|---|
| Maps | `GOOGLE_MAPS_API_KEY`, browser API key |
| SMS | `MSG91_AUTH_KEY`, template and sender variables |
| Push | Firebase configuration/service account |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |
| Payments | Razorpay key, secret and webhook secret |
| KYC | `DIGIO_*` environment variables |
| Storage | `R2_*` and `STORAGE_DRIVER` |
| Payout | `CORPORATE_PAYOUT_PROVIDER` |

The exact variable set must come from server configuration and secret
management, not from public documentation or client bundles.

## Failure Principles

For every integration:

1. Fail closed for authorization or financial confirmation.
2. Preserve database state consistency.
3. Distinguish provider acceptance from provider completion.
4. Use idempotency keys for repeatable operations.
5. Verify signed webhooks with raw payloads.
6. Retry only operations that are safely repeatable.
7. Record provider request/result metadata needed for reconciliation.
8. Redact sensitive provider data from logs.

## Maps Failure

Google Maps failures should:

- record estimate versus real-road state
- keep dispatch and routing usable if a fallback is explicitly allowed
- prevent paid route pricing if trustworthy road distance is mandatory
- use a circuit breaker or cache where implemented

## Notification Failure

Notification failure should not automatically reverse a trip or payment state.
Database notification state and external delivery state are separate concerns.

## Storage Failure

Storage failures should:

- verify and sanitize first
- attempt R2 only if configured
- fall back to local storage only according to policy
- not expose unsanitized or unrestricted private files

## Webhook Replay

Webhook handlers must protect against:

- replay
- duplicate state transition
- wrong provider event
- amount mismatch
- missing request identifiers
- expired signatures

Provider callbacks should remain idempotent and auditable.
