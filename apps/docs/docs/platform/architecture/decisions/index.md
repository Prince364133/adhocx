---
title: Architecture Decision Records
description: Source-observed architecture records for AdhocX.
status: source-mapped
last_reviewed: "2026-11-23"
---

# Architecture Decision Records

These records capture architectural choices visible in the current repository.
They establish a documentation baseline; they are not historical meeting
minutes or proof of the original decision-maker's intent. Rationale is limited
to source-observable consequences.

| ADR | Decision | Status |
|---|---|---|
| [ADR-0001](./adr-0001-nestjs-modular-monolith.md) | Treat the API as one NestJS modular monolith, not separately deployed bounded contexts. | Accepted as current architecture |
| [ADR-0002](./adr-0002-prisma-postgresql.md) | Keep PostgreSQL as the API's persisted relational store, accessed through Prisma. | Accepted as current architecture |
| [ADR-0003](./adr-0003-redis-telemetry-and-pubsub.md) | Distinguish Redis live fan-out from persisted telemetry history and document outage semantics. | Accepted as current architecture |
| [ADR-0004](./adr-0004-client-api-boundary.md) | Keep the shared API as the frontend-to-business-data boundary. | Accepted as current architecture |

These are not a roadmap. Proposed future architecture remains in the
[ETS roadmap archive](../../../apps/ets/roadmap-archive.md). Changes to the
implemented boundaries should add a new ADR and supersede the affected record
rather than silently rewriting its decision.

Use the [ADR and decision-log process](./adr-process.md) and copy
`apps/docs/templates/adr-template.md` when recording a new decision or
changing an existing one. The
[decision changelog](./changelog.md) records the documentation history.
