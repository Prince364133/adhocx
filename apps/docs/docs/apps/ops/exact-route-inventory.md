---
title: Ops Exact Route Inventory
description: Source-derived inventory and behavior summary for every Ops App Router page.
status: source-mapped
last_reviewed: "2026-11-23"
---

# Ops Exact Route Inventory

**Coverage status:** Source-mapped. The 29 entries reconcile to all 29
`apps/ops/src/app/**/page.tsx` files. The [route-by-route reference](./route-by-route-reference.md)
provides the detailed functional, frontend, API, backend and data trace.

| Route pattern | Functional purpose and implementation status | Source file |
|---|---|---|
| `/` | Corporate company hub and tenant navigation | `apps/ops/src/app/page.tsx` |
| `/assignments` | Read-only assignment status and details | `apps/ops/src/app/assignments/page.tsx` |
| `/dashboard` | Daily cross-client operations overview | `apps/ops/src/app/dashboard/page.tsx` |
| `/dashboard/analytics` | Filtered corporate operations analytics | `apps/ops/src/app/dashboard/analytics/page.tsx` |
| `/dashboard/exceptions` | Prioritized route, GPS and SOS queue | `apps/ops/src/app/dashboard/exceptions/page.tsx` |
| `/dashboard/live` | Live dispatch board and route interventions | `apps/ops/src/app/dashboard/live/page.tsx` |
| `/drivers` | Driver directory and filters | `apps/ops/src/app/drivers/page.tsx` |
| `/drivers/:id` | Driver details and operations actions | `apps/ops/src/app/drivers/[id]/page.tsx` |
| `/employees` | Tenant employee directory and CRUD | `apps/ops/src/app/employees/page.tsx` |
| `/live` | Live operations summary and paged routes | `apps/ops/src/app/live/page.tsx` |
| `/live/employees` | Redirect to `/employees`; no separate page workflow | `apps/ops/src/app/live/employees/page.tsx` |
| `/live/exceptions` | Redirect to `/live`; the implemented queue is `/dashboard/exceptions` | `apps/ops/src/app/live/exceptions/page.tsx` |
| `/live/trips` | Redirect to `/live`; no separate trip-list implementation | `apps/ops/src/app/live/trips/page.tsx` |
| `/live/trips/:id` | Redirect to `/live`; use `/routes/:id` for route details | `apps/ops/src/app/live/trips/[id]/page.tsx` |
| `/login` | Ops authentication page outside the shell | `apps/ops/src/app/login/page.tsx` |
| `/map` | Last-known fleet snapshot and live position stream | `apps/ops/src/app/map/page.tsx` |
| `/planner` | Roster planning/review/commit and direct manual-route creation | `apps/ops/src/app/planner/page.tsx` |
| `/routes` | Tenant-scoped route list, dispatch retry and eligible route actions | `apps/ops/src/app/routes/page.tsx` |
| `/routes/:id` | Route manifest, stop details and operational actions | `apps/ops/src/app/routes/[id]/page.tsx` |
| `/safety` | Re-exports Corporate safety landing page | `apps/ops/src/app/safety/page.tsx` |
| `/safety/:id` | Re-exports Corporate safety detail page | `apps/ops/src/app/safety/[id]/page.tsx` |
| `/safety/:id/resolve` | Re-exports Corporate safety resolution page | `apps/ops/src/app/safety/[id]/resolve/page.tsx` |
| `/safety/cockpit` | Ops-specific SOS command cockpit | `apps/ops/src/app/safety/cockpit/page.tsx` |
| `/safety/incidents/:id` | Re-exports Corporate incident detail page | `apps/ops/src/app/safety/incidents/[id]/page.tsx` |
| `/safety/incidents/:id/resolve` | Re-exports Corporate incident resolution page | `apps/ops/src/app/safety/incidents/[id]/resolve/page.tsx` |
| `/safety/incidents/details` | Re-exports Corporate incident-details page | `apps/ops/src/app/safety/incidents/details/page.tsx` |
| `/safety/incidents/resolve` | Re-exports Corporate incident-resolution page | `apps/ops/src/app/safety/incidents/resolve/page.tsx` |
| `/safety/reports` | Re-exports Corporate safety reports page | `apps/ops/src/app/safety/reports/page.tsx` |
| `/support` | Assigned support ticket queue and progress updates | `apps/ops/src/app/support/page.tsx` |

## Route behavior

Dynamic segments resolve to a route page as shown. The Ops app contains
redirect-only legacy pages and Safety pages that directly re-export Corporate
source; the page count must not be interpreted as 29 independent feature
implementations. The API remains authoritative for role, tenant, route-state
and data-ownership checks.

## Sources and verification

- [Ops route-by-route reference](./route-by-route-reference.md) — source paths,
  user actions, API methods, backend services and data relationships.
- [Traceability registry](../../platform/traceability-registry.md) — stable
  application ID and cross-application status.
