---
title: ETS Implementation Status
description: Evidence-based separation of source-present, partial, planned, and historical ETS capabilities.
status: source-mapped
last_reviewed: "2026-11-23"
---

# ETS Implementation Status

## How to read this matrix

This is a repository evidence map, not a production-readiness certification.
“Source-present” means relevant code exists; “Partial” means code exists with
material gaps, unverified end-to-end behavior, or an unfinished acceptance
gate. “Planned” refers to target behavior, not an implementation. “Historical”
identifies old plans, specifications and point-in-time audits. Schema entries
refer to checked-in Prisma files/migrations, not an inspected production DB.

### Capability status

| Capability | Current evidence status | Source-grounded current summary | Current references | Historical/planned material |
|---|---|---|---|---|
| Tenant, office and employee setup | Partial | Corporate tenant and employee modules, API routes and web pages exist. Do not infer the full legacy six-role, office-scope, approval or policy feature set from a screen specification. | `apps/api/src/domains/corporate/tenants/`; [Corporate routes](../corporate/detailed-route-reference.md); [API endpoint inventory](../api/reference/exact-controller-endpoints.md) | [Portal specification](./applications/corporate-portal/07_CORPORATE_CLIENT_PORTAL_SPECIFICATION.md); [master plan](./overview/00_MASTER_PLAN_CORPORATE_ETS.md) |
| Roster intake and demand | Partial | Roster-related controllers/services and application calls exist. Approval/publish/versioning, automated HRMS synchronization and all old spreadsheet promises need per-route confirmation. | `apps/api/src/domains/corporate/rosters/`; [Corporate workflow reference](../corporate/workflow-reference.md) | [Roster specification](./backend/rosters/02_ROSTER_INGESTION_AND_EXCEL_IMPORT_ENGINE.md); [backend plan](./backend/roadmap/19_BACKEND_COMPLETION_IMPLEMENTATION_PLAN.md) |
| Route planning and optimization | Partial | Planner/solver code and deterministic API verification are recorded. The V2 audit still lists browser acceptance, disposable-database migration and DB rollback checks as outstanding. | `apps/api/src/domains/corporate/routing/`; [Corporate workflow reference](../corporate/workflow-reference.md); [route optimizer V2 checkpoint](./backend/dispatch/22_ROUTE_OPTIMIZER_PRODUCTION_COMPLETION_PLAN_V2.md) | [OR-Tools/CVRPTW design](./backend/dispatch/03_ROUTE_OPTIMIZATION_AND_CAPACITY_SOLVER.md) is not proof that OR-Tools is the active solver. |
| Dispatch and offers | Partial | Dispatch services, scheduler and client workflows exist. Live operations, offer durability/ranking, timing guarantees and production load acceptance must be distinguished from older target-state claims. | `apps/api/src/domains/corporate/dispatch/`; [Ops live runbook](../ops/live-operations-runbook.md); [Mobile API matrix](../mobile/service-api-matrix.md) | [H3/dispatch design](./backend/dispatch/04_AUTONOMOUS_DISPATCH_AND_H3_ROUTING_ENGINE.md); [telemetry/dispatch plans](./roadmap-archive.md) |
| Driver route execution | Partial | Trip execution controller/service paths exist. The audited Employee App does not call the server's OTP/QR verification endpoints; some ETS driver screens in Mobile are not router-registered. | `apps/api/src/domains/corporate/execution/`; [Mobile driver guide](../mobile/driver-feature-guide.md); [Employee API matrix](../employee-app/service-api-matrix.md) | [Driver specification](./applications/driver-app/09_DRIVER_MOBILE_APP_SPECIFICATION.md); [trip specification](./backend/trips/05_TRIP_EXECUTION_OTP_AND_5MIN_NO_SHOW_LIFECYCLE.md) |
| Employee schedule and self-service | Partial | Rider routes/providers/repository methods are mapped. Runtime/device evidence and documented client/server mismatches remain. | `apps/api/src/domains/corporate/rider/`; [Employee commuter guide](../employee-app/commuter-feature-guide.md); [Employee API matrix](../employee-app/service-api-matrix.md) | [Employee specification](./applications/employee-app/08_EMPLOYEE_MOBILE_APP_SPECIFICATION.md) |
| Tracking and live telemetry | Partial | Tracking source areas and app queries exist; the exact persistence, pub/sub and deployment behavior must be checked against current adapters/configuration. Do not reuse old freshness, batching or scale claims as guarantees. | `apps/api/src/domains/corporate/tracking/`; [Ops route reference](../ops/route-by-route-reference.md); [Mobile API matrix](../mobile/service-api-matrix.md) | [Realtime specification](./backend/realtime/12_REALTIME_GPS_TRACKING_AND_NOTIFICATIONS.md); [telemetry plan](./backend/realtime/20_LIVE_FLEET_TELEMETRY_PUBSUB_PLAN.md) |
| SOS and safety response | Partial | Corporate safety APIs, Employee SOS flow and Ops response pages exist. Location fallback, lifecycle, alert-provider delivery and response-time claims need explicit verification. | `apps/api/src/domains/corporate/safety/`; [Employee safety notes](../employee-app/boarding-safety-and-api.md); [Ops SOS guide](../ops/sos-and-reassignment-guide.md) | [Command-centre specification](./applications/ops/11_SAFETY_SOS_AND_COMMAND_CENTRE_OPERATIONS.md) |
| Support tickets | Source-present / Partial | Shared ticket services and employee/corporate/Ops pages call ticket APIs. Uploads and role/tenant visibility differ by client. | `apps/api/src/domains/corporate/safety/`; [Employee API matrix](../employee-app/service-api-matrix.md); [Corporate support references](../corporate/detailed-route-reference.md) | Older portal/ops specs should not define current role or SLA behavior. |
| Corporate billing and driver payouts | Partial | Billing, invoices, disputes, rate-card and payout modules/data are present. A proposed complete dual-ledger/payment lifecycle is not implied by those module names. | `apps/api/src/domains/corporate/billing/`; [API model inventory](../api/data/model-inventory.md); [Corporate API reference](../corporate/api-reference.md) | [Finance specification](./backend/finance/13_DUAL_FINANCIAL_LEDGERS_BILLING_AND_PAYOUTS.md); [backend completion plan](./backend/roadmap/19_BACKEND_COMPLETION_IMPLEMENTATION_PLAN.md) |
| Analytics and reports | Partial | Analytics module/controller and selected Corporate screens exist. Metric definitions, tenant filters, exact results and production data quality need per-endpoint verification. | `apps/api/src/domains/corporate/analytics/`; [Corporate route reference](../corporate/detailed-route-reference.md) | Dashboard/report screen and SLA claims in older specs are not proof of complete KPIs. |
| DDD target architecture | Planned | Repository remains organized as a NestJS corporate domain within the API monolith; plans for separate pure domain packages, use cases and ports/adapters are target design. | Current source map: [API module/service reference](../api/corporate-module-services.md) | [DDD blueprint](./architecture/16_DDD_ARCHITECTURE_AND_TRANSFORMATION_PLAN.md); [codebase transformation plan](./architecture/17_CURRENT_CODEBASE_TO_DDD_TRANSFORMATION_PLAN.md) |
| External providers and production operation | Not assessed | Repository adapters/configuration indicate integration points, not valid credentials, active subscriptions, production traffic or operating SLAs. | [Provider adapters](../api/provider-adapters.md); [deployment and environment docs](../../platform/operations/deployment-overview.md) | Provider/uptime claims in old specifications require authorized runtime evidence. |

## Cross-application status

| Application | Documentation coverage | Open evidence boundary |
|---|---|---|
| API | Controller, service, data and provider inventories are linked. | Endpoint-specific validation, deployment, provider and test evidence remain. |
| Corporate | All 65 page files are source-mapped to route/API references. | Four nested layout route families redirect; deployed behavior and complete tests remain. |
| Employee App | 110 canonical paths, 21 aliases, providers, features and API calls are documented. | Runtime/device and route-to-test evidence remain; boarding and safe-reach gaps are documented. |
| Mobile | 107 canonical path constants and 65 aliases have route/screen/feature/API references. | Device/runtime evidence remains; ETS driver screens are source-present but unregistered. |
| Ops | 29 page files have source-mapped functional and technical references. | Runtime URL and endpoint/test evidence remain. |
| Admin | 30 page files have source-mapped route references. | Runtime and endpoint-specific verification remain. |

## Historical audit snapshots

- The 2026-11-03 PRD/code audit is a dated backend snapshot; it records what
  was found then and should not be assumed to describe today's tree.
- The 2026-11-11 routing/dispatch audit and 2026-11-12 route-optimizer V2
  checkpoint are dated work records. They report fixes and outstanding
  acceptance gates at those points in time; current code and tests take
  precedence.
- Other original product and architecture specifications are indexed in the
  [historical archive](./historical-archive.md).

## Sources and update rule

Use the [API endpoint inventory](../api/reference/exact-controller-endpoints.md),
[API service/data maps](../api/corporate-module-services.md),
application route/feature guides and checked-in source as current evidence.
Update this matrix when those sources change. A claim should be promoted from
Partial only with the relevant API/client/data behavior and necessary runtime
or test evidence—not because a roadmap says its workstream is complete.
