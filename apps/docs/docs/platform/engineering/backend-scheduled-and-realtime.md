---
title: Backend Scheduled and Realtime Processing
description: Scheduler, Redis, pub/sub, SSE and maintenance behavior in the API.
---

# Backend Scheduled and Realtime Processing

**Evidence status:** Verified against dispatch scheduler, Redis services,
tracking, notification and GPS maintenance implementations.

## Dispatch Scheduling

`DispatchSchedulerService` polls due delayed work and delegates it to the
handler registered by `DispatchService`. Redis sorted-set jobs can be shared
across API instances and are atomically claimed; the no-Redis sorted-map
fallback is process-local. `DispatchService` also rehydrates pending timers
and runs a ten-second safety sweep for expired/orphaned offers. These jobs
cover:

- 30-second pre-dispatch notifications
- scheduled dispatch trigger
- offer wave expiry
- redispatch/retry

The implementations are
`apps/api/src/modules/dispatch/dispatch-scheduler.service.ts` and
`apps/api/src/modules/dispatch/dispatch.service.ts`.

## Corporate scheduling and dispatch workers

The Corporate domain has separate lifecycle-managed schedulers:

| Worker | Default cadence / scope | Coordination |
|---|---|---|
| `CorporateAutoPlannerService` | Polls every 60 seconds; scans a three-day planning horizon and applies the one-hour-before-cutoff lead. | Redis tick and per-shift locks; without Redis, the work is single-instance. |
| `CorporateDispatchSchedulerService` | Evaluates dispatchable routes every 30 seconds; its queue worker polls every two seconds with bounded batch/concurrency settings. | Redis-backed shared work/expiry state and locks where available; no-Redis mode is single-instance. |
| `CorporateSosEscalationScheduler` | Polls every 15 seconds; the default SOS acknowledgement SLA is 120 seconds. Also checks telemetry loss and safe-drop timeouts. | Redis tick lock plus conditional database updates; without Redis, a single process runs the pass. |
| `CorporateGpsPartitionMaintenance` | Runs an initial pass after startup, then repeats hourly by default. | Redis lock prevents overlapping maintenance instances where Redis is available. |

These are configured defaults, not a guarantee of how often a deployed
instance runs: environment configuration and scheduler enablement apply.
The source files are
`apps/api/src/domains/corporate/scheduling/corporate-auto-planner.service.ts`,
`apps/api/src/domains/corporate/dispatch/corporate-dispatch-scheduler.service.ts`,
`apps/api/src/domains/corporate/safety/corporate-sos-escalation.scheduler.ts`
and `apps/api/src/domains/corporate/tracking/corporate-gps-partition-maintenance.service.ts`.

## Redis Pub/Sub

Redis Pub/Sub uses:

- dedicated publisher and subscriber connections
- batching for high-rate telemetry channels
- reconnection and resubscription
- pattern and exact-channel handlers
- local in-process fallback while Redis is unavailable

The local fallback cannot fan out across API processes. See
`apps/api/src/redis/redis-pubsub.service.ts` and
`apps/api/src/redis/redis.service.ts`.

## Live Tracking

Corporate tracking supports:

- latest vehicle position
- route timeline
- playback history
- fleet live snapshot
- live-stream SSE
- single-use stream tickets

Live stream clients must use a ticket bought with a bearer access token.
The access token itself should not be placed in a live-stream URL.
`StreamTicketService` validates/consumes those tickets; the tracking stream
hub manages process-local SSE subscribers while Redis pub/sub carries
cross-process events. See `apps/api/src/redis/stream-ticket.service.ts` and
`apps/api/src/domains/corporate/tracking/telemetry-stream-hub.ts`.

## GPS Maintenance

Corporate telemetry services include:

- partition maintenance
- stale/tracking-loss detection
- telemetry writer and stream hub
- trip event recording

GPS freshness classifications should remain aligned with the tracking API.
`CorporateGpsIngestService` accepts updates, `CorporateTelemetryWriter`
batches durable writes, `CorporateGpsPartitionMaintenance` manages the
retention partitions, and `CorporateTrackingService` provides query/playback
views. `TripEventRecorder` persists route/trip history. The corresponding
source files are under `apps/api/src/domains/corporate/tracking/`.

## Notifications

The notification module coordinates:

- in-app notifications
- Firebase push
- MSG91 SMS
- notification preferences
- campaign broadcasts
- audience estimates
- device token registration

Provider delivery failures should be handled as integration failures, not as
proof that the database state or trip state changed.

## Scheduled Safety

Corporate safety includes SOS escalation scheduling and tracking-loss
detection. Automatic escalation must remain auditable and must not bypass
incident lifecycle state constraints.
The scheduler implementation is
`apps/api/src/domains/corporate/safety/corporate-sos-escalation.scheduler.ts`.

## Notification job queue

`NotificationQueueService` uses an in-process job queue with bounded
retries/dead-letter accounting and an optional Redis-backed duplicate guard.
Redis does not make the queued job itself durable; queued jobs can be lost on
process restart. See
`apps/api/src/modules/notifications/notification-queue.service.ts`.

For service ownership and provider details, see the
[module/service reference](../../apps/api/module-service-reference.md) and
[provider adapters](../../apps/api/provider-adapters.md).
