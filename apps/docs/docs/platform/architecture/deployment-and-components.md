---
title: Deployment and API Components
description: Production Compose topology and source-level Corporate API components.
status: source-mapped
last_reviewed: "2026-11-23"
---

# Deployment and API Components

## Declared production deployment

This diagram summarizes `docker-compose.prod.yml` and
`infrastructure/nginx/production.conf`. It describes checked-in deployment
configuration, not a live cloud inventory.

```mermaid
flowchart LR
  Users["Browser and mobile-web users"]
  Developer["Developer or operator"]
  Marketing["Marketing site<br/>Cloudflare Worker referenced by Nginx comment<br/>not in production Compose"]
  OtherClients["Ops, Corporate and Employee workspaces<br/>deployment targets not declared in this Compose"]
  Docs["Docusaurus workspace<br/>hosting target not declared here"]

  subgraph ProdCompose["docker-compose.prod.yml"]
    Gateway["Nginx gateway<br/>ports 80 / 443"]
    API["NestJS API<br/>container port 3000"]
    Admin["Next.js Admin<br/>container port 3001"]
    Mobile["Flutter Web assets<br/>Nginx container port 80"]
    Postgres[("PostgreSQL/PostGIS 16<br/>persistent volume")]
    Redis[("Redis 7.2<br/>persistent volume")]
  end

  Users --> Marketing
  Users --> Gateway
  Gateway -->|api.adhocx.com| API
  Gateway -->|admin.adhocx.com| Admin
  Gateway -->|app.adhocx.com| Mobile
  API -->|Prisma / DATABASE_URL| Postgres
  API -->|ioredis / REDIS_URL| Redis
  OtherClients -. "source clients call /api/v1; deployed routing not shown" .-> API
  Developer --> Docs
```

The production manifest lists PostgreSQL, Redis, API, Admin, Mobile and the
Nginx gateway. Its Nginx configuration routes the declared API, Admin and
Mobile hostnames. A configuration comment says the public Marketing site is
hosted separately on Cloudflare Workers; this repository does not include that
Worker's deployment definition here. Ops, Corporate, Employee App and
documentation are workspace applications, but their deployment targets are
not represented in this Compose topology. Do not infer that they are either
deployed or unavailable based only on this file.

For comparison, `docker-compose.yml` declares local PostgreSQL, Redis, API,
Admin and Marketing services; it is a separate local topology and is not the
production diagram above.

## Corporate API source-level component view

This view traces one supported corporate GPS path through the API. It is
inside one NestJS process; the Nest modules are code boundaries, not separate
network services.

```mermaid
flowchart LR
  Bootstrap["main.ts<br/>NestFactory bootstrap"] --> AppModule["AppModule"]
  AppModule --> Corporate["CorporateDomainModule"]
  Corporate --> ExecController["CorporateTripExecutionController"]
  Corporate --> ExecService["CorporateTripExecutionService"]
  Corporate --> TrackingModule["CorporateTrackingModule"]
  ExecController -->|Guarded telemetry request| ExecService
  ExecService -->|Delegates GPS fix| Ingest["CorporateGpsIngestService"]
  Ingest -->|Latest key and history stream| Redis[("Redis")]
  Ingest -. "Accepted live fix" .-> PubSub["RedisPubSubService"]
  PubSub -->|Subscribe and fan-out| Hub["TelemetryStreamHub"]
  Hub -->|SSE fixes / heartbeat| Ops["Ops client"]
  Writer["CorporateTelemetryWriter"] -->|XREADGROUP / XACK| Redis
  Writer -->|Batched createMany| Prisma["Database module / Prisma"]
  Prisma --> Postgres[("PostgreSQL<br/>CorporateVehiclePosition")]
```

This is the C4 component-level view expressed as a Mermaid flowchart. The
native C4 context renderer raised a browser runtime error in this site, so the
source-level component relationships use the flowchart renderer instead.

The path is implemented across
`apps/api/src/domains/corporate/corporate-domain.module.ts`,
`apps/api/src/domains/corporate/execution/corporate-trip-execution.controller.ts`,
`apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts`
and `apps/api/src/domains/corporate/tracking/corporate-tracking.module.ts`.
The distinction between live
best-effort Pub/Sub and durable GPS history is detailed in
[data and control flow](./data-and-control-flow.md).
