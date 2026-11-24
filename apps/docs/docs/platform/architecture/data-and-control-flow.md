---
title: Data and Control Flow
description: Source-grounded API request, corporate GPS telemetry, and core ETS data flows.
status: source-mapped
last_reviewed: "2026-11-23"
---

# Data and Control Flow

This page describes representative source paths, not a guarantee that every
route follows an identical lifecycle. Controller decorators, module wiring,
feature-specific services and provider availability determine the exact
behavior.

## Protected HTTP request

```mermaid
sequenceDiagram
  participant Client as Web or mobile client
  participant API as NestJS API
  participant Guards as Route guards
  participant Controller as Controller
  participant Service as Domain service
  participant Prisma as Database module / Prisma
  participant DB as PostgreSQL

  Client->>API: HTTPS request to /api/v1
  API->>Guards: Run guards declared on this controller/route
  Guards-->>API: Authenticated and authorized context, or reject
  API->>Controller: Match route and validate DTO with global ValidationPipe
  Controller->>Service: Invoke feature operation
  Service->>Prisma: Read/write domain records
  Prisma->>DB: SQL query or transaction
  DB-->>Prisma: Rows/result
  Prisma-->>Service: Data result
  Service-->>Controller: Operation result
  Controller-->>API: HTTP response
  API-->>Client: Response transformation or exception handling
```

The request/response path is configured in `apps/api/src/main.ts`. Authentication,
role, tenant and resource guards are attached selectively; public endpoints do
not all pass through the same authorization checks. The Corporate ETS
controller/service/data relationships are mapped in the
[API endpoint inventory](../../apps/api/reference/exact-controller-endpoints.md),
[service map](../../apps/api/corporate-module-services.md) and
[ETS status matrix](../../apps/ets/implementation-status.md).

## Corporate driver GPS and live-map flow

The high-rate corporate GPS path is not a synchronous “write PostgreSQL, then
publish” operation. The ingest service uses Redis for deduplication/latest
position and a Redis Stream for history; a background writer batches stream
entries into PostgreSQL. Live fan-out is a separate, best-effort Pub/Sub path.

```mermaid
sequenceDiagram
  participant Driver as Driver client
  participant Controller as CorporateTripExecutionController
  participant Execution as CorporateTripExecutionService
  participant Ingest as CorporateGpsIngestService
  participant Redis as Redis keys and Stream
  participant PubSub as RedisPubSubService
  participant Hub as TelemetryStreamHub
  participant Ops as Ops live-map SSE client
  participant Writer as CorporateTelemetryWriter
  participant DB as PostgreSQL / Prisma

  Driver->>Controller: POST /api/v1/corporate/trips/routes/:id/telemetry
  Controller->>Execution: Submit RouteTelemetryDto
  Execution->>Ingest: ingest(route, fix)
  Ingest->>Redis: Deduplicate, advance latest position, append history Stream entry
  opt Accepted in-order fix
    Ingest->>PubSub: Batch live update to ops/tenant channels (fire and forget)
    PubSub-->>Hub: Deliver subscribed channel messages
    Hub-->>Ops: SSE fixes events (coalesced for fleet view)
  end
  Writer->>Redis: XREADGROUP / reclaim pending entries
  Writer->>DB: Batch createMany into CorporateVehiclePosition
  Writer->>Redis: XACK after successful database write
  Ingest-->>Execution: Ingest result and persistence mode
  Execution-->>Controller: Operation result
  Controller-->>Driver: HTTP acknowledgement
```

If Redis is unavailable, Pub/Sub falls back to an in-process event bus that
reaches only subscribers on that API instance. GPS history can be buffered
locally and written by the same API instance; that local buffer is bounded and
is not equivalent to a durable cross-instance queue. The ingest response
reports the actual persistence mode. The stream writer acknowledges Redis
entries only after a successful database batch; unacknowledged items can be
reclaimed and deduplicated.

Relevant source: `apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts`,
`apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts`,
`apps/api/src/domains/corporate/tracking/corporate-gps-ingest.service.ts`,
`apps/api/src/domains/corporate/tracking/corporate-telemetry-writer.service.ts`,
`apps/api/src/domains/corporate/tracking/telemetry-stream-hub.ts`,
`apps/api/src/domains/corporate/tracking/corporate-tracking.controller.ts` and
`apps/api/src/redis/redis-pubsub.service.ts`.

## Core ETS relational model

This is a functional ERD of selected Prisma relations, not a complete schema
diagram. Optional relations are marked as such. Fields and mappings are
defined in `apps/api/prisma/schema.prisma`.

```mermaid
erDiagram
  CorporateTenant ||--o{ CorporateOffice : contains
  CorporateTenant ||--o{ CorporateEmployee : enrolls
  CorporateTenant ||--o{ CorporateRoster : owns
  CorporateTenant ||--o{ CorporateTransportRequest : scopes
  CorporateTenant ||--o{ CorporateRoute : scopes
  CorporateTenant ||--o{ CorporateInvoice : bills

  CorporateOffice ||--o{ CorporateEmployee : assigns
  CorporateOffice ||--o{ CorporateRoster : schedules
  CorporateOffice ||--o{ CorporateRoute : plans

  CorporateRoster o|--o{ CorporateTransportRequest : source_for
  CorporateEmployee ||--o{ CorporateTransportRequest : requests
  CorporateEmployee o|--o{ CorporateRouteStop : boards_at
  CorporateTransportRequest o|--o| CorporateRouteStop : represented_by

  CorporateRoute ||--o{ CorporateRouteStop : orders
  Driver o|--o{ CorporateRoute : assigned_to
  Vehicle o|--o{ CorporateRoute : assigned_to
  CorporateRoute ||--o{ CorporateInvoiceLine : priced_as
  CorporateInvoice ||--o{ CorporateInvoiceLine : contains
```

The central business chain is tenant and office setup → roster (optional
ingestion source) → transport requests → planned route and ordered stops →
invoice lines grouped into a tenant invoice. A route may be assigned a driver
and vehicle; those links are optional in the schema. `CorporateRouteStop`
references a request through a unique nullable field, so the relationship is
optional and at most one stop per request. This diagram omits many supporting
tables, including roster entries, offers, safety events, trip events,
positions, rate cards, disputes and payouts; consult the
[API data dictionary](../../apps/api/data/data-dictionary.md) for all models.
