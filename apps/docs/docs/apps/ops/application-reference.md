---
title: Ops Application Reference
description: Verified Next.js operations, live fleet and safety application.
---

# Ops Application Reference

**Evidence status:** Page files and their visible behavior, route helpers and
API calls are source-mapped in the [route-by-route reference](./route-by-route-reference.md).

## Application

The Ops application is a Next.js 14 operations desk running on port `7004`.
It serves operations staff who monitor corporate transport, review and manage
routes, follow fleet locations, plan routes, respond to safety alerts and
work assigned support tickets.

`OpsShell`:

- checks for a locally stored access token and an `OPS` or `ADMIN` role, then
  redirects to login if either is missing; this client check is not server
  session verification
- configures the shared Corporate API session, which uses the Ops token and
  refresh-token handlers
- auto-selects the first corporate tenant only for migrated `/live`, `/routes`
  and `/safety` paths when no tenant is already selected
- wraps pages in Corporate `SessionProvider` in Ops mode

## Route Inventory

| Area | Routes |
|---|---|
| Authentication | `/login` |
| Dashboard | `/`, `/dashboard`, `/dashboard/analytics`, `/dashboard/exceptions`, `/dashboard/live` |
| Live operations | `/live`, `/map`; legacy `/live/trips`, `/live/trips/:id`, `/live/exceptions` and `/live/employees` redirect |
| Drivers | `/drivers`, `/drivers/[id]` |
| Employees | `/employees` |
| Routes | `/routes`, `/routes/[id]` |
| Planner | `/planner` |
| Assignments | `/assignments` |
| Safety | `/safety/cockpit`; other `/safety/*` pages re-export Corporate pages |
| Support | `/support` |

## Primary Responsibilities

- Monitor live route and employee operations
- View and inspect routes and drivers
- Reassign or cancel operational routes
- Plan or modify routes
- Acknowledge and resolve safety incidents
- Coordinate SOS response
- View support queues
- Use corporate tenant scope for shared ETS modules

## Tenant Scope

Tenant selection may come from the home hub, a route query parameter, or a
page-specific selector and browser storage. The API remains authoritative for
tenant and office access. An empty list or a client-side tenant filter is not
proof that another tenant's data is accessible.

## Technical Architecture

`apps/ops/src/app/layout.tsx` mounts `OpsShell` for App Router pages. Pages
normally call `opsApi` from `apps/ops/src/lib/api/opsClient.ts`. The client
uses the configured `/api/v1` base URL, attaches bearer credentials,
refreshes eligible expired sessions, and unwraps the API response envelope.
The local API is port `7001` during development. Protected backend endpoints
apply server-side authentication, role and Corporate tenant checks.

Ops reuses Corporate source rather than copying all of its implementation:
the shell imports Corporate `SessionContext` and API-session configuration;
the Safety route files mostly re-export Corporate pages. The [route
reference](./route-by-route-reference.md) records those implementation
boundaries, per-page endpoints and the route/planner/tracking data flow.

Key persisted data includes Corporate tenants, offices, employees, routes,
route stops, transport requests, drivers, vehicles, vehicle positions, SOS
alerts, support tickets and marketplace assignments. The [API service
guide](../api/corporate-module-services.md) explains which services own these
flows; the [data dictionary](../api/data/data-dictionary.md) documents schema
fields and relations.

## Guides

- [Route-by-route reference](./route-by-route-reference.md)
- [Live operations runbook](./live-operations-runbook.md)
- [SOS and reassignment guide](./sos-and-reassignment-guide.md)
- [Exact route inventory](./exact-route-inventory.md)
