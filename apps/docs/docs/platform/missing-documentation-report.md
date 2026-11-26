---
title: Missing Documentation Report
description: Prioritized documentation gaps linked to stable feature IDs and approved completion phases.
status: partial
last_reviewed: "2026-11-23"
---

# Missing Documentation Report

This report tracks missing detail, not missing application functionality.
The source-derived inventories show that routes, controllers, constants and
models exist; they do not prove that the corresponding behavior is fully
explained. Status labels follow the [documentation status definitions](./documentation-status.md).
The "Planned phase" column records the phase assigned when a gap was
identified. Phase 14's QA-documentation scope is complete; any remaining
runtime evidence or test implementation is explicitly still open.

## Prioritized gaps

| Gap ID | Affected stable ID(s) | Missing documentation | Evidence currently available | Status | Planned phase |
|---|---|---|---|---|---|
| `GAP-API-CONTRACTS` | `APP-API`, all feature IDs | Exact per-endpoint downstream business rules, nested service/repository/data effects and route-specific response examples beyond the static controller/DTO evidence | 50 controller pages, named DTO/validator catalog, shared error/webhook references, Phase 5 service maps and Phase 6 Admin route links | Partial / Missing detail | Phases 7–14 |
| `GAP-API-RUNTIME-VERIFICATION` | `APP-API`, provider-backed features | Runtime/Swagger URL reconciliation and request/response execution evidence for critical routes and integrations | 431 method decorators and 436 AST-derived controller/method path variants; no runtime route introspection in this phase | Not assessed | Phase 14 |
| `GAP-SERVICE-MAP` | All feature IDs | Exact per-route service/repository/data/provider call graph and behavior | Phase 5 documents all 29 feature-module files, all 78 `*.service.ts` files and all four `*.adapter.ts` files; Phase 6 adds Admin UI-to-helper/controller links; deeper per-route calls remain | Partial (backend inventory complete) | Phases 7–14 |
| `GAP-ADMIN-ROUTES` | `APP-ADMIN`, `FEATURE-ADMIN-PLATFORM` | Runtime URL/action confirmation, remaining field-level validation and audit effects, and test evidence beyond current source-linked route/API references | [30-route reference](../apps/admin/route-by-route-reference.md) and [exact inventory](../apps/admin/exact-route-inventory.md) reconcile all 30 page files and document source-visible actions/APIs | Partial (Phase 6 source reference complete) | Phase 14 |
| `GAP-OPS-ROUTES` | `APP-OPS`, `FEATURE-ETS-SAFETY-TRACKING` | Runtime URL confirmation, remaining endpoint-specific validation, audit/data effects and test evidence beyond the source-mapped route flows | [29-route reference](../apps/ops/route-by-route-reference.md), [live operations runbook](../apps/ops/live-operations-runbook.md), and [SOS/reassignment guide](../apps/ops/sos-and-reassignment-guide.md) map all 29 pages and source-visible workflows | Partial / Source-mapped (Phase 7 complete) | Phase 14 |
| `GAP-CORPORATE-ROUTES` | `APP-CORPORATE`, ETS feature IDs | Runtime URL confirmation, endpoint-specific validation/audit/data evidence and test mapping for the 65 source routes | [65-route reference](../apps/corporate/detailed-route-reference.md), [API reference](../apps/corporate/api-reference.md), [workflow guide](../apps/corporate/workflow-reference.md), [troubleshooting](../apps/corporate/troubleshooting.md), [permissions guide](../apps/corporate/permissions-and-workflows.md) and [exact inventory](../apps/corporate/exact-route-inventory.md) map source behavior; four nested layouts currently block `/live/**`, `/bookings/**`, `/rosters/**` and `/safety/**` | Partial / Source-mapped (Phase 8 complete) | Phase 14 |
| `GAP-MOBILE-SCREENS` | `APP-MOBILE`, `FEATURE-MARKETPLACE`, `FEATURE-TRIPS` | Runtime/device behavior and test evidence for Mobile routes; continued source reconciliation as routes evolve | [172-constant route inventory](../apps/mobile/exact-route-inventory.md), [screen/component catalog](../apps/mobile/screen-component-catalog.md), [driver guide](../apps/mobile/driver-feature-guide.md), [vendor guide](../apps/mobile/vendor-feature-guide.md) and [service/API matrix](../apps/mobile/service-api-matrix.md) map routes, state, services and backend endpoint families; Corporate ETS driver UI remains source-present but unregistered | Partial / Source-mapped (Phase 9 complete) | Phase 14 |
| `GAP-EMPLOYEE-SCREENS` | `APP-EMPLOYEE`, `FEATURE-ETS-EXECUTION`, `FEATURE-ETS-SAFETY-TRACKING` | Device/runtime behavior, complete route-to-test coverage and follow-up of documented client/server gaps | [Commuter feature guide](../apps/employee-app/commuter-feature-guide.md), [110-route inventory](../apps/employee-app/exact-route-inventory.md), [screen map](../apps/employee-app/screen-component-catalog.md), [provider catalog](../apps/employee-app/state-provider-catalog.md), [service/API matrix](../apps/employee-app/service-api-matrix.md) and [boarding/safety notes](../apps/employee-app/boarding-safety-and-api.md) trace source workflows and limitations | Partial / Source-mapped (Phase 10 complete) | Phase 14 |
| `GAP-MARKETING-PAGES` | `APP-MARKETING`, `FEATURE-MARKETING-CONTENT-LEADS` | Verify deployed lead API/error behavior and static-build content; reconcile the documented form/DTO mismatch, review consent/privacy and public claims with owners, and add browser/runtime evidence | [21-route page reference](../apps/marketing/detailed-page-reference.md), [component catalog](../apps/marketing/component-feature-catalog.md), [lead conversion guide](../apps/marketing/lead-conversion-guide.md), [SEO/publishing guide](../apps/marketing/seo-and-publishing-guide.md) and [exact route inventory](../apps/marketing/exact-page-inventory.md) provide source-grounded coverage; code defects are documented, not fixed | Partial / Source-mapped (Phase 11 complete) | Phase 14 |
| `GAP-ETS-IMPLEMENTATION-STATUS` | `DOMAIN-ETS`, ETS feature IDs | Verify production/provider behavior and remaining endpoint/test evidence; keep implementation, plans and dated audits separately classified as source and documentation evolve | [Current-state overview](../apps/ets/current-state-overview.md), [implementation status matrix](../apps/ets/implementation-status.md), [module/API map](../apps/ets/module-and-api-map.md), [workflow map](../apps/ets/operational-workflows.md), [historical archive](../apps/ets/historical-archive.md) and [roadmap archive](../apps/ets/roadmap-archive.md) separate source-linked status from legacy product/design documents | Partial / Source-mapped (Phase 12 complete) | Phase 14 |
| `GAP-ARCH-DECISIONS` | All application IDs | Verify deployed topology/provider availability; extend diagrams when source changes or a feature needs a dedicated sequence/ERD | [Architecture reference](../platform/architecture/index.md), [deployment/component views](../platform/architecture/deployment-and-components.md), [data/control flow and ETS ERD](../platform/architecture/data-and-control-flow.md), [diagram style guide](../platform/architecture/diagram-style-guide.md), [ADR index](../platform/architecture/decisions/index.md) and [decision changelog](../platform/architecture/decisions/changelog.md) document source-linked architecture and selected flows; production infrastructure remains unverified | Partial / Source-mapped (Phase 13 deliverables complete) | Phase 14 |
| `GAP-TEST-EVIDENCE` | All application and feature IDs | Executed route-to-test evidence, browser/device automation or completed manual runs, and named accountable owners | [Testing overview](./engineering/testing-overview.md), [coverage/ownership matrix](./engineering/test-coverage-matrix.md), [browser plan](./engineering/browser-qa-plan.md), [device matrix](./engineering/mobile-device-test-matrix.md) and [execution runbook](./engineering/test-execution.md) document 116 API specs, one dispatch simulation, nine shared-package specs, 54 Flutter files, three unintegrated frontend source-regression scripts, CI boundaries, and missing automation/ownership | Partial — QA documentation complete; execution and automation gaps remain | Follow-up test implementation/runtime evidence; not scheduled in Phase 15 documentation scope |
| `GAP-OPERATIONS-RUNBOOKS` | `APP-API`, `APP-OPS`, ETS feature IDs | Provider-specific verified procedures, completed backup/restore rehearsal, named on-call contacts and tested rollback | [Deployment boundaries](./operations/deployment-overview.md), [CI/CD](./operations/ci-cd.md), [health/recovery](./operations/health-and-recovery.md), [migration/backup runbook](./operations/database-migrations-and-backups.md), [TLS/DNS](./operations/tls-dns-and-certificates.md), [Mobile release](./operations/mobile-release-runbook.md) and [incident response](./operations/incident-response-and-escalation.md) map checked-in configuration, safe gates and unverified operations | Partial — source-mapped runbooks complete; live procedures and rehearsal evidence absent | Phase 15 documentation complete; operational verification remains |

## Inventory corrections made during Phases 2–3

- The prior regex-generated API appendix incorrectly contained 491 route rows:
  it joined routes to all controller bases in multi-controller source files.
  Phase 3 replaced it with class-aware TypeScript AST extraction: 44 controller
  files, 50 decorated classes, 431 HTTP method decorators and 436
  controller/method path variants.
- The Prisma schema has 75 models. Five present in source were missing from
  the old documentation inventory: `VehiclePricingTier`, `RateCardVersion`,
  `RateCardRow`, `LocalityMaster` and `ZonalQuoteSnapshot`. They are now
  included by name with purpose descriptions based on schema fields.
- The Flutter route files declare 172 Mobile constants (107 canonical path
  constants plus 65 aliases) and 131 Employee constants (110 canonical paths
  plus 21 aliases). The Mobile source contains one pair of constants that
  shares a path.
- The web route totals reconcile to 30 Admin, 29 Ops and 65 Corporate pages,
  for 124 source `page.tsx` files.
- The Marketing source inventory reconciles to 21 page/endpoint files.

## Phase 4 gap closure

`GAP-DATA-DICTIONARY` is complete for the checked-in Prisma schema and
migration sources: all 75 models, 42 enums, 1,272 fields, declared
relationships and model-level keys/indexes are documented; the 33 migration
directories and tenant identifier/isolation boundaries are reconciled. The
[data dictionary](../apps/api/data/data-dictionary.md) explicitly does not
certify live database drift or applied-migration state. Exact endpoint-to-
service-to-model effects remain in the endpoint/application-specific follow-up
work.

## Phase 5 gap closure

The [module/service reference](../apps/api/module-service-reference.md),
[Corporate module/service guide](../apps/api/corporate-module-services.md)
and [provider adapter reference](../apps/api/provider-adapters.md) document
the backend module and service inventory, Corporate workflows, provider
boundaries, and scheduled/realtime behavior. All 78 service files and four
adapter files reconcile to source; the feature-module inventory contains 29
files. The docs also distinguish standalone exported use cases from verified
runtime paths, including the H3 dispatch caveat. This closes the module and
service inventory deliverable, not every endpoint's full call graph. Exact
frontend-action-to-endpoint-to-service-to-data effects and runtime evidence
remain tracked in `GAP-API-CONTRACTS`, `GAP-SERVICE-MAP` and
`GAP-API-RUNTIME-VERIFICATION`.

## Phase 6 gap closure

The [Admin route-by-route reference](../apps/admin/route-by-route-reference.md)
documents the functional purpose, visible user actions, page/component state,
API helper calls and linked backend references for all 30 Admin routes. The
[route inventory](../apps/admin/exact-route-inventory.md) was corrected where
source inspection found redirects, compatibility paths or duplicate screens.
The source audit also records that `/users` currently renders the vendor
component, `/reports` redirects to finance, and the login page does not
implement the MFA helper exposed by the API client. Route declarations and
controller evidence are not runtime verification; unresolved field-level,
audit and per-route test evidence remains tracked in `GAP-ADMIN-ROUTES`.
Phase 14 documents the available QA methods and gaps but does not claim that
these routes were executed in a browser.

## Phase 7 gap closure

The [Ops route-by-route reference](../apps/ops/route-by-route-reference.md)
maps all 29 Ops page files to their actual behavior, frontend implementation,
API helpers, backend service families and important data. It explicitly
distinguishes four redirect-only live URLs and eight Safety re-exports from
independently implemented Ops pages. The [live operations
runbook](../apps/ops/live-operations-runbook.md) covers tenant scope, live
location freshness, dispatch, planning and support. The [SOS and
reassignment guide](../apps/ops/sos-and-reassignment-guide.md) traces alert
actions, the backend escalation scheduler and reassignment inputs/guards.
The inventory and route reference reconcile to 29 source page files. These
are source-level traces; deployed runtime URLs, some endpoint-specific
validation/persistence details and test evidence remain in
`GAP-API-RUNTIME-VERIFICATION`, `GAP-API-CONTRACTS` and `GAP-TEST-EVIDENCE`.

## Phase 8 gap closure

The [Corporate route-by-route reference](../apps/corporate/detailed-route-reference.md)
and [exact inventory](../apps/corporate/exact-route-inventory.md) reconcile all
65 Corporate `page.tsx` files, document the actual redirect/re-export behavior,
and connect source-visible page actions to API helper families and backend/data
references. The [API reference](../apps/corporate/api-reference.md),
[workflow guide](../apps/corporate/workflow-reference.md),
[troubleshooting guide](../apps/corporate/troubleshooting.md),
[permissions guide](../apps/corporate/permissions-and-workflows.md) and
[architecture page](../apps/corporate/architecture.md) provide the supporting
technical, functional and tenant-scope context. The source audit found that
the layouts for live, bookings, rosters and safety currently redirect to
`/dashboard`, so their child pages are documented as implemented in source but
not reachable through the current route tree. Inventory reconciliation found
exactly 65 source paths and 65 matching route rows in both route references.
The Docusaurus production build, docs TypeScript check and `git diff --check`
passed. Deployed runtime URL behavior, exact endpoint-level validation/audit
effects and test evidence remain open under `GAP-API-RUNTIME-VERIFICATION`,
`GAP-API-CONTRACTS` and `GAP-TEST-EVIDENCE`.

## Phase 9 gap closure

The [Mobile route inventory](../apps/mobile/exact-route-inventory.md) maps all
172 named route constants: 107 canonical paths and 65 role/compatibility
aliases. Each canonical path maps to a GoRouter screen or redirect and source
file; the inventory also documents the duplicate `/sign-in` constant and the
router's additional deep-link/compatibility routes. The [screen/component
catalog](../apps/mobile/screen-component-catalog.md) groups all 280 Dart files
by feature and responsibility. The [driver](../apps/mobile/driver-feature-guide.md)
and [vendor](../apps/mobile/vendor-feature-guide.md) guides explain user
workflows, visible validations and route caveats. The [service/API
matrix](../apps/mobile/service-api-matrix.md) maps helper methods to HTTP
methods/paths, backend controller/service areas and related data models; the
[application reference](../apps/mobile/application-reference.md) records
bootstrap, state, dependencies and Android/iOS/web differences.

Source verification found 119 registered GoRoute entries, including named
routes that redirect and dynamic aliases. It also found that the Corporate ETS
active-route screen/API adapter are present in source but are not registered
or instantiated by the audited application shell. Source route reconciliation
and docs validation do not certify deployed device behavior, push delivery or
external SDK behavior. Phase 14 documents the available tests and proposed
device checks; executed evidence remains open in `GAP-TEST-EVIDENCE`.

## Phase 10 gap closure

The Employee documentation maps all 110 canonical GoRouter paths to
registered screen builders or redirects and source files, and lists the 21
alias constants separately. The [commuter guide](../apps/employee-app/commuter-feature-guide.md)
describes sign-in/eligibility, schedule and change requests, trip/tracking,
boarding, safe reach, feedback, SOS, support, history and profile workflows.
The [provider catalog](../apps/employee-app/state-provider-catalog.md) explains
auth/data/permission/theme state, API client behavior, caches and failure
handling; the [service/API matrix](../apps/employee-app/service-api-matrix.md)
maps repository calls to NestJS routes/services, data areas and authorization.
The [screen catalog](../apps/employee-app/screen-component-catalog.md) maps
routes and reusable components. It covers 197 Dart library files by
directory; test files exist but are not interpreted as complete coverage.

Source verification also identified material limits: `/company-sso` redirects
to mobile entry; Employee boarding OTP is compared locally and the QR route
does not call server verification; the safe-reach screen can show success when
it skips its request without a stop ID; and SOS can fall back to `0,0`
coordinates. These are documented as current implementation caveats, not
certified production behavior. The Phase 14 device matrix gives a proposed
checklist; runtime/device checks and route-to-test evidence remain open in
`GAP-TEST-EVIDENCE`.

## Scope note

Route inventories start as discovery aids. An approved application phase can
promote them to source-mapped references when user actions, API calls,
services and data relationships are traced. Source-mapped status does not
certify deployed runtime behavior or live database state.

## Sources and verification

- [Traceability registry](./traceability-registry.md) — stable IDs, source counts and feature-level evidence.
- `apps/api/src/**/*.controller.ts` — API controller and method decorator source.
- `apps/api/prisma/schema.prisma` — Prisma model source.
- `apps/admin/src/app/`, `apps/ops/src/app/`, `apps/corporate/src/app/` — Next.js page source.
- `apps/mobile/lib/routes/app_routes.dart`, `apps/employee_app/lib/routes/app_routes.dart` — Flutter route declarations.
- `apps/marketing/src/pages/` — Marketing page/endpoint source.
