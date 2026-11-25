---
title: ETS Current Module and API Map
description: Source-oriented map of the current corporate API modules, controller families, and cross-app clients.
status: source-mapped
last_reviewed: "2026-11-23"
---

# ETS Current Module and API Map

**Evidence status:** Module and controller families are mapped from the
checked-in API structure and source inventories. A controller or adapter
existing does not establish that every feature, provider or environment is
working.

## API module map

The corporate domain is a NestJS module tree under
`apps/api/src/domains/corporate/`. The repository includes domain areas for
tenants, rosters, scheduling, routing, dispatch, execution, tracking, rider
self-service, safety, support, operations, analytics and billing. Modules
coordinate shared database, Redis, notifications, audit and provider
services. The codebase remains an API modular monolith; the
`packages/domain-ets` / ports-and-adapters architecture described in old
proposals is not the current module topology.

| Controller/API family | Responsibility | Current source evidence |
|---|---|---|
| `corporate/tenants` | Tenant, office, employee, settings and related administration. | Corporate tenant controllers/services and tenant-scoped client pages. |
| `corporate/rosters` | Roster templates, upload/validation and roster operations. | Roster controller/services; corporate roster pages. |
| `corporate/routes` | Route planning, route access, optimization and route detail. | Routing controllers/planner; Corporate and Ops pages. |
| `corporate/dispatch` | Dispatch and driver offer operations. | Dispatch controller/service/scheduler; driver and Ops callers. |
| `corporate/trips` | Driver execution, boarding, stop and trip lifecycle APIs. | Trip execution controllers/services; Mobile and Employee callers. |
| `corporate/me` | Employee profile, schedule, trips, tracking, cancellation, feedback and related self-service. | Rider controller/service; Employee app repository. |
| `corporate/ops` | Live operations and dispatch-management actions. | Operations controller/service; Ops app. |
| `corporate/safety` | SOS, safety, safe-drop/reach and related actions. | Safety controller/service; Employee, Mobile and Ops flows. |
| `corporate/support/tickets` | Corporate support-ticket workflows and conversations. | Shared corporate support-ticket controllers/services and app clients. |
| `corporate/analytics` | Corporate operational reporting endpoints. | Analytics controller/service and Corporate pages. |
| `corporate/billing` | Invoices, disputes, credit notes, rate cards and payouts. | Billing controllers/services and Corporate/Admin pages. |
| `corporate/scheduling` | Shift scheduling and related policy endpoints. | Scheduling controllers/services and Corporate pages. |

Use the [exact controller endpoint inventory](../api/reference/exact-controller-endpoints.md)
for source-derived method/path declarations, the
[API module/service reference](../api/corporate-module-services.md) for
backend implementation relationships, and each client API matrix for actual
client calls.

## Cross-application responsibility map

| Capability | Main client(s) | API/data areas | Evidence and known boundary |
|---|---|---|---|
| Tenant and roster administration | Corporate, Admin | Tenants, roster, policy and employee records | Source routes and API calls are documented; the older multi-role/approval specification is not current truth without source confirmation. |
| Route planning and dispatch | Corporate, Ops, Mobile | Routing, dispatch, Redis and route/offer records | Code and deterministic test evidence exist; browser/production acceptance remains distinct. |
| Trip and stop execution | Mobile, Employee, Ops, Corporate | Execution, requests, routes, stops and trip events | Driver execution APIs exist; Employee OTP/QR verification has documented client/server mismatches. |
| Tracking | Mobile, Employee, Corporate, Ops | Tracking, Redis, vehicle positions and live events | Source workflows are mapped; persistence, provider availability and live production behavior require separate verification. |
| Safety and support | Employee, Mobile, Ops, Corporate | Safety alerts, notifications and support tickets | App/API paths are documented; do not infer an end-to-end emergency-provider integration from page copy. |
| Finance | Corporate, Admin, Mobile | Billing, invoices, rate cards, payout and earnings records | Some flows are present; complete payout lifecycle and live payment state need endpoint/provider evidence. |

## Authentication and tenant boundaries

Corporate APIs use authentication, role and corporate-access guards on
protected controller families. The API resolves the caller and applies
tenant/resource checks; a client-provided identifier is not, on its own,
authorization. Actual roles and guard placement vary by endpoint. Verify the
controller decorators and
[tenant/RBAC reference](../../platform/security/rbac-and-tenancy.md) for a
specific action rather than applying a blanket guarantee.

## Current implementation references

- API module tree: `apps/api/src/domains/corporate/`
- Corporate route reference: [Corporate application](../corporate/detailed-route-reference.md)
- Employee flows: [Employee service/API matrix](../employee-app/service-api-matrix.md)
- Driver flows: [Mobile service/API matrix](../mobile/service-api-matrix.md)
- Ops routes: [Ops route reference](../ops/route-by-route-reference.md)
- Admin routes: [Admin route reference](../admin/route-by-route-reference.md)
- Database: [API model inventory](../api/data/model-inventory.md) and
  [data dictionary](../api/data/data-dictionary.md)
