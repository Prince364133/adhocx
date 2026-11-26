---
title: ETS Historical Specifications and Audits
description: Index of dated product/design baselines and audit snapshots that are not current implementation authority.
status: historical
last_reviewed: "2026-11-23"
---

# ETS Historical Specifications and Audits

The documents below are retained for context, requirements history and
decision traceability. Their original paths are preserved so existing links
continue to work. A “source of truth” label inside an older document describes
its original intent, not its authority over current code.

## Product and technical specification baselines

| Document | Original subject | How to use it now |
|---|---|---|
| [00 — ETS master plan](./overview/00_MASTER_PLAN_CORPORATE_ETS.md) | Pilot model, formulas and target workflow. | Historical business/design baseline; verify each rule against tenant policy and current API behavior. |
| [01 — Technical architecture](./architecture/01_TECHNICAL_ARCHITECTURE_AND_SYSTEM_DESIGN.md) | Original topology and platform architecture. | Historical architecture proposal; use current source maps and platform architecture for as-built topology. |
| [02 — Roster ingestion](./backend/rosters/02_ROSTER_INGESTION_AND_EXCEL_IMPORT_ENGINE.md) | Spreadsheet and demand-ingestion target design. | Requirements history; implementation status is partial and source-linked in the matrix. |
| [03 — Route optimization](./backend/dispatch/03_ROUTE_OPTIMIZATION_AND_CAPACITY_SOLVER.md) | CVRPTW/OR-Tools design and capacity rules. | Target design, not proof the named solver or all constraints are active. |
| [04 — H3 dispatch](./backend/dispatch/04_AUTONOMOUS_DISPATCH_AND_H3_ROUTING_ENGINE.md) | H3 search, traffic and offer design. | Historical dispatch proposal; check current dispatch source and deployment. |
| [05 — Trip execution](./backend/trips/05_TRIP_EXECUTION_OTP_AND_5MIN_NO_SHOW_LIFECYCLE.md) | OTP/QR, waiting and no-show design. | Historical behavioral baseline; compare to the current driver/employee client paths. |
| [06 — Scheduling](./backend/scheduling/06_RESCHEDULE_AND_CANCELLATION_ENGINE.md) | Cutoffs, rescheduling and route balancing. | Do not assume one fixed cutoff; inspect active tenant policy and API logic. |
| [07 — Corporate portal](./applications/corporate-portal/07_CORPORATE_CLIENT_PORTAL_SPECIFICATION.md) | Corporate screen/product specification. | Historical UI requirements; current route status is in the Corporate reference. |
| [08 — Employee mobile app](./applications/employee-app/08_EMPLOYEE_MOBILE_APP_SPECIFICATION.md) | Employee screen/product specification. | Historical UI requirements; current app behavior is in the Employee guide and API matrix. |
| [09 — Driver mobile app](./applications/driver-app/09_DRIVER_MOBILE_APP_SPECIFICATION.md) | Driver app screen/product specification. | Historical UI requirements; current router and service calls are in Mobile references. |
| [10 — Admin panel](./applications/admin/10_SUPER_ADMIN_AND_TRIPS_RIDE_MANAGEMENT_PANEL.md) | Admin operations panel specification. | Historical requirements; compare to current Admin and API route maps. |
| [11 — Safety command centre](./applications/ops/11_SAFETY_SOS_AND_COMMAND_CENTRE_OPERATIONS.md) | Safety/SOS/ops specification. | Historical safety requirements; do not treat stated response SLAs or integrations as verified. |
| [12 — Realtime tracking](./backend/realtime/12_REALTIME_GPS_TRACKING_AND_NOTIFICATIONS.md) | GPS freshness and notification design. | Historical protocol baseline; current adapter/persistence details require code evidence. |
| [13 — Finance and payouts](./backend/finance/13_DUAL_FINANCIAL_LEDGERS_BILLING_AND_PAYOUTS.md) | Dual-ledger and settlement design. | Target financial design; verify each current model, controller and provider state. |
| [14 — Database contracts](./backend/data/14_DATABASE_SCHEMA_POSTGIS_AND_DATA_CONTRACTS.md) | Proposed relational/spatial DDL and isolation. | Not a live or canonical schema; use Prisma schema/migrations and the API data dictionary. |
| [15 — API/events/states](./backend/api/15_API_INVENTORY_EVENT_CONTRACTS_AND_STATE_MACHINES.md) | Original API and lifecycle baseline. | Includes a dated generated appendix; current endpoint inventory and DTOs take precedence. |

## Dated audit records

| Audit | Snapshot date | Interpretation |
|---|---|---|
| 18 — PRD vs. code backend gap audit (`internal/audits/18_PRD_VS_CODE_GAP_AUDIT_2026-11-03.md`) | 2026-11-03 | Repository-only historical findings; this `internal/` document is intentionally excluded from the public Docusaurus site. Later code changes may have addressed or changed findings. |
| 21 — Onboarding/routing/dispatch audit (`internal/audits/21_ONBOARDING_ROUTING_DISPATCH_AUDIT_2026-11-11.md`) | 2026-11-11 | Repository-only historical findings/fix plan; this `internal/` document is intentionally excluded from the public Docusaurus site. Use current source plus dated follow-up evidence before treating an item as open or fixed. |

For current status, start at the [implementation matrix](./implementation-status.md)
and [current-state overview](./current-state-overview.md), not at the original
specification directory.
