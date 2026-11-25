---
title: ETS Roadmaps and Target-State Proposals
description: Index of ETS DDD, backend and subsystem plans kept separate from current-state documentation.
status: planned
last_reviewed: "2026-11-23"
---

# ETS Roadmaps and Target-State Proposals

These pages describe proposed architecture, work sequencing or acceptance
plans. None is a substitute for checking current source. Their historical
paths remain available for traceability; current capability status is in the
[implementation status matrix](./implementation-status.md).

| Plan | Classification | Guidance |
|---|---|---|
| [16 — DDD architecture and transformation plan](./architecture/16_DDD_ARCHITECTURE_AND_TRANSFORMATION_PLAN.md) | Target architecture | The planned pure domain package/ports-and-adapters topology must not be described as the current implementation unless source confirms it. |
| [17 — Current codebase to DDD plan](./architecture/17_CURRENT_CODEBASE_TO_DDD_TRANSFORMATION_PLAN.md) | Target architecture and migration plan | Describes desired package structure, not an approved/current code map. |
| [19 — Backend completion implementation plan](./backend/roadmap/19_BACKEND_COMPLETION_IMPLEMENTATION_PLAN.md) | Historical work plan | Workstreams and schemas may have since been implemented, changed or abandoned. Recheck current code and tests. |
| [20 — Live fleet telemetry/pub-sub plan](./backend/realtime/20_LIVE_FLEET_TELEMETRY_PUBSUB_PLAN.md) | Dated review and phased plan | Contains both work already reported at its review date and future phases. Use its own checkpoint dates and current runtime evidence. |
| [22 — Route optimizer production completion V2](./backend/dispatch/22_ROUTE_OPTIMIZER_PRODUCTION_COMPLETION_PLAN_V2.md) | Dated implementation/acceptance record | Its 2026-11-12 execution notes report verification and remaining acceptance checks at that time; it is not a present production sign-off. |

## Separation rule

- Current behavior goes in the current overview, implementation matrix and
  source-linked app/API references.
- Proposed behavior stays labeled **Planned** and must not be presented as
  implemented.
- Dated audits and work records stay **Historical** snapshots.
- When a planned item is implemented, update the current source references and
  matrix with code/test evidence; do not silently rewrite the old plan as if
  the plan itself proved completion.
