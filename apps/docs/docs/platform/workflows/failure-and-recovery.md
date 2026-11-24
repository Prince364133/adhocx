---
title: Failure and Recovery Workflows
description: Recovery behavior for dispatch, re-planning, Redis, notifications, providers and payouts.
---

# Failure and Recovery Workflows

**Evidence status:** Verified for explicit fallback, lock and retry
implementations. Provider-specific operational behavior must be environment
verified.

## No Eligible Driver

When no eligible marketplace driver is found:

1. Requirement becomes or remains `NO_DRIVER_AVAILABLE`.
2. Optional redispatch scheduler retries can run.
3. The client can retry explicitly.
4. Cancellation remains available according to state rules.

The exact retry interval and radius configuration is environment/service
dependent.

## Offer Expiry

When an offer expires:

1. Expired offers are reaped.
2. Requirement redispatch may begin another wave.
3. The driver behavior/cooldown service may update candidate state.
4. New offers are created only if eligibility and capacity remain valid.

## Redis Unavailable

Redis pub/sub and rate-control services include fallback behavior:

- Local in-process pub/sub remains available on one API instance.
- Redis-dependent offer state may degrade to local/single-instance handling.
- Multi-instance delivery or distributed locking is not guaranteed until Redis
  reconnects.
- Background work should rehydrate or resweep after startup/outage.

## Corporate Re-planning

Corporate re-planning:

- serializes request/shift/route operations with locks
- retries stale guarded writes
- re-sequences and retimes pre-dispatch routes
- does not reshuffle assigned or active routes
- cancels empty routes
- merges under-filled routes only within constraints
- cancels stops in place for dispatched routes

If a stale state write is detected, the operation retries with fresh data.

## Dispatch Double Acceptance

Offer acceptance and assignment operations use:

- database state checks
- Redis/offer state where available
- conditional updates
- conflict responses
- no-assignment or no-duplicate-trip safeguards

The server is authoritative when two clients replay or race an operation.

## Payment and Payout Failure

Payment webhooks must have verified signatures before credit or state changes.

Payout submission:

- uses unique idempotency keys
- remains `PROCESSING` until provider confirmation
- does not mark paid at submit
- reuses keys when retrying failed payouts
- records reconciliation differences
- records reversal rows instead of deleting paid history

Ambiguous provider submit errors remain re-sendable and must be reconciled.

## SOS Failure

The SOS scheduler:

- polls on an interval
- takes a distributed/instance lock
- escalates unacknowledged alerts
- checks telemetry loss
- checks unacknowledged safe-drop timeout

If Redis is unavailable, single-instance lock behavior applies.
