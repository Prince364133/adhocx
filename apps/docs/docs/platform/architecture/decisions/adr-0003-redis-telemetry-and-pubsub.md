---
title: ADR-0003 — Redis Telemetry and Pub/Sub
description: Record of Redis roles and corporate telemetry durability boundaries.
status: accepted-current-architecture
last_reviewed: "2026-11-23"
---

# ADR-0003: Redis Telemetry and Pub/Sub

- **Status:** Accepted as the current architecture record
- **Decision recorded:** 2026-11-23
- **Supersedes:** None

## Context

The API uses Redis for multiple infrastructure responsibilities. Corporate
GPS ingest writes latest-position state and a Redis Stream; a background
consumer writes history batches to PostgreSQL. Live-map events use Redis
Pub/Sub and are deliberately separate from the history writer.

## Decision

Document Redis Pub/Sub as live fan-out, not a durable event log. Document the
Redis Stream plus PostgreSQL writer as the history path. Describe the
in-process fallback as instance-local and do not claim it provides
cross-instance delivery or durable buffering.

## Source-grounded consequences

- Live update delivery can differ from historical GPS persistence.
- The stream consumer acknowledges entries after database writes; failed
  writes leave entries available for reclaim.
- When Redis is unavailable, Pub/Sub fallback only reaches same-process
  subscribers. Local history buffering is bounded and may report a
  non-durable persistence mode.

## Evidence

`apps/api/src/redis/redis-pubsub.service.ts`,
`apps/api/src/domains/corporate/tracking/corporate-gps-ingest.service.ts`,
`corporate-telemetry-writer.service.ts`,
`telemetry-stream-hub.ts` and `apps/api/prisma/schema.prisma`
(`CorporateVehiclePosition`).
