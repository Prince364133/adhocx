---
title: Traceability Registry
description: Stable documentation IDs and source-backed route, feature, API and data coverage.
status: partial
last_reviewed: "2026-11-23"
---

# Traceability Registry

This registry assigns stable IDs to the major runnable applications, the ETS
domain, and cross-application features. The IDs are documentation keys, not
runtime identifiers. Keep an ID when its page is renamed; add a new ID only
for a genuinely new responsibility.

The route and model inventories linked here prove that source declarations
were found. They do not prove complete behavior or one-to-one relationships
between a UI page, API endpoint, service and database model. Those connections
are marked **Partial** unless traced end to end.

## Application and domain registry

| Stable ID | Application/domain | Public overview | Source inventory | Status | Evidence |
|---|---|---|---|---|---|
| `APP-API` | API | [API overview](../apps/api/index.md) | [Controller endpoint inventory](../apps/api/reference/exact-controller-endpoints.md) | Inventory / Partial | 44 controller source files, 50 decorated controller classes, 431 HTTP method decorators and 436 path variants under `apps/api/src/` |
| `APP-ADMIN` | Admin | [Admin overview](../apps/admin/index.md) | [Admin route-by-route reference](../apps/admin/route-by-route-reference.md) and [route inventory](../apps/admin/exact-route-inventory.md) | Partial / Source-mapped | All 30 Next.js page files have source-grounded route coverage; runtime and some field-level/audit evidence remain |
| `APP-OPS` | Ops | [Ops overview](../apps/ops/index.md) | [29-route reference](../apps/ops/route-by-route-reference.md), [live runbook](../apps/ops/live-operations-runbook.md), [SOS/reassignment guide](../apps/ops/sos-and-reassignment-guide.md), and [route inventory](../apps/ops/exact-route-inventory.md) | Partial / Source-mapped | All 29 Next.js page files are mapped to actual page, redirect or re-export behavior, source-visible actions and API/backend/data references; runtime and test evidence remain |
| `APP-CORPORATE` | Corporate | [Corporate overview](../apps/corporate/index.md) | [65-route functional/technical reference](../apps/corporate/detailed-route-reference.md), [API reference](../apps/corporate/api-reference.md), [workflow guide](../apps/corporate/workflow-reference.md) and [exact inventory](../apps/corporate/exact-route-inventory.md) | Partial / Source-mapped | All 65 Next.js `page.tsx` files under `apps/corporate/src/app/` reconcile to both route references; four nested layouts currently redirect entire route families to `/dashboard`, and runtime/test verification remains |
| `APP-EMPLOYEE` | Employee App | [Employee overview](../apps/employee-app/index.md) | [Commuter feature guide](../apps/employee-app/commuter-feature-guide.md), [110-route inventory](../apps/employee-app/exact-route-inventory.md), [screen map](../apps/employee-app/screen-component-catalog.md), [provider catalog](../apps/employee-app/state-provider-catalog.md), [service/API matrix](../apps/employee-app/service-api-matrix.md) and [boarding/safety notes](../apps/employee-app/boarding-safety-and-api.md) | Partial / Source-mapped | 131 constants: 110 canonical paths and 21 aliases; 110 GoRoute destinations are source-mapped. Device/runtime and route-to-test evidence remain; client/server gaps are documented. |
| `APP-MOBILE` | Mobile | [Mobile overview](../apps/mobile/index.md) | [Application reference](../apps/mobile/application-reference.md), [172-constant route map](../apps/mobile/exact-route-inventory.md), [screen/component catalog](../apps/mobile/screen-component-catalog.md), [driver guide](../apps/mobile/driver-feature-guide.md), [vendor guide](../apps/mobile/vendor-feature-guide.md) and [service/API matrix](../apps/mobile/service-api-matrix.md) | Partial / Source-mapped | All 172 named constants are mapped as 107 canonical paths plus 65 aliases; 119 GoRoute entries include dynamic aliases. Source mapping is complete for Phase 9; runtime/device and test evidence remain. |
| `APP-MARKETING` | Marketing | [Marketing overview](../apps/marketing/index.md) | [21-route page reference](../apps/marketing/detailed-page-reference.md), [exact inventory](../apps/marketing/exact-page-inventory.md), [component catalog](../apps/marketing/component-feature-catalog.md), [lead guide](../apps/marketing/lead-conversion-guide.md) and [SEO guide](../apps/marketing/seo-and-publishing-guide.md) | Partial / Source-mapped | All 21 page/endpoint files and shared features are mapped. Lead payload/DTO mismatch and false-success network path are documented; deployment, runtime/API behavior and public claims remain to verify. |
| `APP-DOCS` | Documentation | [Documentation overview](../apps/docs/index.md) and [architecture reference](./architecture/index.md) | `apps/docs/sidebars.ts`, `apps/docs/docusaurus.config.ts`, [architecture decision records](./architecture/decisions/index.md) | Partial / Source-mapped | Curated docs navigation, source-grounded architecture diagrams, ADRs and browser-checked Mermaid rendering; documentation-site hosting remains unverified |
| `DOMAIN-ETS` | Enterprise Transportation System | [ETS overview](../apps/ets/index.md) and [current-state overview](../apps/ets/current-state-overview.md) | [Implementation status matrix](../apps/ets/implementation-status.md), [module/API map](../apps/ets/module-and-api-map.md), [workflow map](../apps/ets/operational-workflows.md), [historical archive](../apps/ets/historical-archive.md) and [roadmap archive](../apps/ets/roadmap-archive.md) | Partial / Source-mapped | Shared domain across API, Corporate, Employee, Mobile, Ops and Admin; current implementation is distinguished from plans and dated audits. Production/provider and remaining endpoint/test evidence remain. |

## Backend module registry

These IDs identify major implementation modules. The [module/service
reference](../apps/api/module-service-reference.md) and its related guides now
explain the backend inventory, wiring and representative service/provider
behavior. Feature statuses below remain **Partial** where exact endpoint,
client-action, authorization, error and persistence effects have not been
traced end to end.

| Stable module ID | Responsibility | Source evidence | Related feature ID(s) | Status |
|---|---|---|---|---|
| `MOD-AUTH` | Authentication | `apps/api/src/modules/auth/` | `FEATURE-AUTH` | Partial |
| `MOD-REQUIREMENTS` | Demand/requirement lifecycle | `apps/api/src/modules/requirements/` | `FEATURE-MARKETPLACE` | Partial |
| `MOD-OFFERS` | Marketplace offers | `apps/api/src/modules/offers/` | `FEATURE-MARKETPLACE` | Partial |
| `MOD-ASSIGNMENTS` | Requirement assignment | `apps/api/src/modules/assignments/` | `FEATURE-MARKETPLACE` | Partial |
| `MOD-TRIPS` | Marketplace trip lifecycle | `apps/api/src/modules/trips/` | `FEATURE-TRIPS` | Partial |
| `MOD-ETS-ROSTERS` | Corporate roster ingestion and lifecycle | `apps/api/src/domains/corporate/rosters/` | `FEATURE-ETS-ROSTER-ROUTING` | Partial |
| `MOD-ETS-ROUTING` | Corporate route planning and travel-time providers | `apps/api/src/domains/corporate/routing/` | `FEATURE-ETS-ROSTER-ROUTING` | Partial |
| `MOD-ETS-DISPATCH` | Corporate driver offers and route dispatch | `apps/api/src/domains/corporate/dispatch/` | `FEATURE-ETS-ROSTER-ROUTING` | Partial |
| `MOD-ETS-EXECUTION` | Corporate route and stop execution | `apps/api/src/domains/corporate/execution/` | `FEATURE-ETS-EXECUTION` | Partial |
| `MOD-ETS-BILLING` | Corporate billing, disputes, rates and payouts | `apps/api/src/domains/corporate/billing/` | `FEATURE-ETS-BILLING` | Partial |
| `MOD-ETS-TRACKING` | Corporate GPS ingestion and live tracking | `apps/api/src/domains/corporate/tracking/` | `FEATURE-ETS-SAFETY-TRACKING` | Partial |
| `MOD-ETS-SAFETY` | Corporate SOS and support tickets | `apps/api/src/domains/corporate/safety/` | `FEATURE-ETS-SAFETY-TRACKING` | Partial |
| `MOD-LEADS` | Lead capture | `apps/api/src/modules/leads/` | `FEATURE-MARKETING-CONTENT-LEADS` | Partial |
| `MOD-BLOGS` | Blog content | `apps/api/src/modules/blogs/` | `FEATURE-MARKETING-CONTENT-LEADS` | Partial |
| `MOD-ADMIN` | Platform administration | `apps/api/src/modules/admin/` | `FEATURE-ADMIN-PLATFORM` | Partial |

## Source inventory reconciliation

| Inventory | Source count | Documentation count | Status | Evidence |
|---|---:|---:|---|---|
| Admin Next.js pages | 30 | 30 | Inventory | `apps/admin/src/app/**/page.tsx`; [route inventory](../apps/admin/exact-route-inventory.md) |
| Ops Next.js pages | 29 | 29 | Source-mapped | `apps/ops/src/app/**/page.tsx`; [route-by-route reference](../apps/ops/route-by-route-reference.md) |
| Corporate Next.js pages | 65 | 65 | Source-mapped | `apps/corporate/src/app/**/page.tsx`; [route-by-route reference](../apps/corporate/detailed-route-reference.md) and [exact inventory](../apps/corporate/exact-route-inventory.md) |
| Combined Next.js pages | 124 | 124 | Reconciled | 30 + 29 + 65 source page files and their route inventory rows |
| Mobile Flutter route constants | 172 | 172 | Source-mapped | `apps/mobile/lib/routes/app_routes.dart`; 107 canonical path constants plus 65 aliases; one canonical pair shares `/sign-in`, leaving 106 unique paths; 119 GoRoute registrations |
| Employee App Flutter route constants | 131 | 131 | Source-mapped | `apps/employee_app/lib/routes/app_routes.dart`; 110 canonical literal paths and 21 aliases; 110 GoRoute entries |
| Employee App Dart library files | 197 | 197 | Source-mapped by directory | `apps/employee_app/lib/`; feature, shared UI, provider, repository, service, model, route, theme and widget files |
| Marketing page/endpoint files | 21 | 21 | Inventory | `.astro` and `.ts` files under `apps/marketing/src/pages/` |
| API controller source files | 44 | 44 | Reconciled | `*controller.ts` files under `apps/api/src/`; these files contain 50 decorated controller classes |
| API decorated controller classes | 50 | 50 | Reconciled | TypeScript AST found 50 classes decorated with `@Controller` |
| API HTTP method decorators | 431 | 436 path variants | Reconciled with AST | 431 `Get`, `Post`, `Put`, `Patch` or `Delete` method decorators expand to 436 controller/method path variants |
| API feature-module source files | 29 | 29 | Reconciled | Feature modules under `apps/api/src/modules/`; see the [module/service reference](../apps/api/module-service-reference.md) |
| Prisma models | 75 | 75 | Reconciled | All schema models have field-level references in the [data dictionary](../apps/api/data/data-dictionary.md) |
| Prisma enums | 42 | 42 | Reconciled | Enum values are mapped to model fields in the [enum reference](../apps/api/data/enums.md) |
| Prisma fields | 1,272 | 1,272 | Reconciled | 1,052 scalar/enum fields and 220 relation fields; current schema only, not live database introspection |
| Prisma migration directories | 33 | 33 | Reconciled | [Migration history](../apps/api/data/migration-history.md) catalogs the checked-in SQL directories |
| API service files | 78 | 78 | Reconciled | [Module/service reference](../apps/api/module-service-reference.md) and [Corporate service map](../apps/api/corporate-module-services.md) cite each `*.service.ts` implementation |
| API adapter files | 4 | 4 | Reconciled | [Provider adapter reference](../apps/api/provider-adapters.md) maps Google routing/traffic adapter files and their ports |

The 436 API path variants are source-declared controller/method combinations,
not a certification of 436 independently verified runtime URLs. This phase
did not count tests or attempt a live runtime route introspection. The
earlier 491-row appendix was produced by a text parser that combined each
route with every controller base found in a multi-controller source file;
Phase 3 replaced it with class-aware TypeScript AST extraction.

## Feature traceability matrix

The mapping is intentionally at feature/module level. Frontend inventory
pages enumerate route entry points; API inventories enumerate method/path
and controller; the service and model links identify implementation areas.
Exact per-route joins, DTOs, authorization, error behavior and persistence
effects remain future work.

| Stable feature ID | Functional area | Frontend route evidence | API/controller evidence | Service evidence | Data evidence | Status |
|---|---|---|---|---|---|---|
| `FEATURE-AUTH` | Sign-in, account setup and session-related workflows across clients | [Mobile driver guide](../apps/mobile/driver-feature-guide.md), [Mobile route map](../apps/mobile/exact-route-inventory.md), [Employee commuter guide](../apps/employee-app/commuter-feature-guide.md), [Employee route inventory](../apps/employee-app/exact-route-inventory.md), and web application route inventories | `AuthController`; see [API endpoint appendix](../apps/api/reference/exact-controller-endpoints.md), [Mobile API matrix](../apps/mobile/service-api-matrix.md) and [Employee API matrix](../apps/employee-app/service-api-matrix.md) | `apps/api/src/modules/auth/auth.service.ts` | `User` in `apps/api/prisma/schema.prisma` | Partial — Client/server request flows are source-mapped; runtime, cross-client and test evidence remain |
| `FEATURE-MARKETPLACE` | Vehicle requirements, offers and assignment | [Mobile vendor guide](../apps/mobile/vendor-feature-guide.md), [driver guide](../apps/mobile/driver-feature-guide.md), [Mobile route inventory](../apps/mobile/exact-route-inventory.md), and Employee routes | `RequirementsController`, `OffersController`, `AssignmentsController`; see [API endpoint appendix](../apps/api/reference/exact-controller-endpoints.md) and [Mobile API matrix](../apps/mobile/service-api-matrix.md) | `apps/api/src/modules/requirements/requirements.service.ts`, `apps/api/src/modules/offers/offers.service.ts`, `apps/api/src/modules/assignments/assignments.service.ts` | `Requirement`, `Offer`, `Assignment` | Partial — Mobile screens/services are mapped; per-action runtime contracts, error behavior and tests remain |
| `FEATURE-TRIPS` | Trip lifecycle, trip detail and trip history | [Mobile driver guide](../apps/mobile/driver-feature-guide.md), [Mobile vendor guide](../apps/mobile/vendor-feature-guide.md), [Mobile route inventory](../apps/mobile/exact-route-inventory.md), [Employee commuter guide](../apps/employee-app/commuter-feature-guide.md), [Employee route inventory](../apps/employee-app/exact-route-inventory.md), [Corporate route reference](../apps/corporate/detailed-route-reference.md) and [Corporate inventory](../apps/corporate/exact-route-inventory.md) | `TripsController`, `CorporateTripExecutionController`, `CorporateRiderController`; see [API endpoint appendix](../apps/api/reference/exact-controller-endpoints.md), [Mobile API matrix](../apps/mobile/service-api-matrix.md), [Employee API matrix](../apps/employee-app/service-api-matrix.md) and [Corporate API reference](../apps/corporate/api-reference.md) | `apps/api/src/modules/trips/trips.service.ts`, `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts`, `apps/api/src/domains/corporate/rider/corporate-rider.service.ts` | `Trip`, `TripEvent`, `CorporateTransportRequest`, `CorporateRoute`, `CorporateRouteStop`, `CorporateTripEvent` | Partial — Employee and Mobile source flows are mapped; boarding verification gap and cross-client runtime/test evidence remain |
| `FEATURE-ETS-ROSTER-ROUTING` | Corporate roster ingestion, routing, scheduling and dispatch | [Corporate route reference](../apps/corporate/detailed-route-reference.md), [Corporate workflows](../apps/corporate/workflow-reference.md), [Corporate inventory](../apps/corporate/exact-route-inventory.md), [Employee routes](../apps/employee-app/exact-route-inventory.md), and [ETS workflow](./workflows/ets-roster-to-route.md) | `CorporateRosterController`, `CorporateRoutingController`, `CorporateSchedulingController`, `CorporateDispatchController`; see [API endpoint appendix](../apps/api/reference/exact-controller-endpoints.md) and [Corporate API reference](../apps/corporate/api-reference.md) | `roster-ingestion.service.ts`, `roster-lifecycle.service.ts`, `corporate-route-planner.service.ts`, `corporate-dispatch.service.ts` under `apps/api/src/domains/corporate/` | `CorporateRoster`, `CorporateRosterEntry`, `CorporateTransportRequest`, `CorporateRoute`, `CorporateRouteStop` | Partial — source workflow is mapped; route blockers, runtime verification and endpoint-specific data effects remain |
| `FEATURE-ETS-EXECUTION` | Corporate trip execution, rider boarding and route-stop lifecycle | [Employee commuter guide](../apps/employee-app/commuter-feature-guide.md), [Employee routes](../apps/employee-app/exact-route-inventory.md), [Employee API matrix](../apps/employee-app/service-api-matrix.md), [Mobile source-only Corporate ETS note](../apps/mobile/driver-feature-guide.md), [Corporate route reference](../apps/corporate/detailed-route-reference.md), [Corporate workflows](../apps/corporate/workflow-reference.md), and [boarding/safety reference](../apps/employee-app/boarding-safety-and-api.md) | `CorporateTripExecutionController`, `CorporateRiderController`; see [API endpoint appendix](../apps/api/reference/exact-controller-endpoints.md) and [Corporate API reference](../apps/corporate/api-reference.md) | `apps/api/src/domains/corporate/execution/corporate-trip-execution.service.ts` | `CorporateTransportRequest`, `CorporateRoute`, `CorporateRouteStop`, `CorporateTripEvent`, `CorporateTripFeedback` | Partial — Employee OTP/QR UI does not invoke server verification endpoints; Employee and Corporate source paths are mapped, runtime/device/test evidence remain |
| `FEATURE-ETS-BILLING` | Corporate invoices, disputes, rate cards and payouts | [Corporate route reference](../apps/corporate/detailed-route-reference.md), [Corporate workflows](../apps/corporate/workflow-reference.md), [Corporate inventory](../apps/corporate/exact-route-inventory.md), [billing workflow](./workflows/billing-and-invoice.md) | `CorporateBillingController`, `CorporateRateCardController`, `CorporatePayoutWebhookController`; see [API endpoint appendix](../apps/api/reference/exact-controller-endpoints.md) and [Corporate API reference](../apps/corporate/api-reference.md) | `corporate-billing.service.ts`, `corporate-invoice-dispute.service.ts`, `corporate-payout.service.ts`, `corporate-rate-card-admin.service.ts` under `apps/api/src/domains/corporate/billing/` | `CorporateInvoice`, `CorporateInvoiceLine`, `CorporateInvoiceDispute`, `CorporateCreditNote`, `CorporatePayoutBatch`, `CorporatePayout`, `CorporateRateCard`, `CorporateDriverRateCard` | Partial — authorization, calculations and write effects need endpoint-level trace |
| `FEATURE-ETS-SAFETY-TRACKING` | Live vehicle position, safety alerts and support cases | [Corporate route reference](../apps/corporate/detailed-route-reference.md), [Corporate workflows](../apps/corporate/workflow-reference.md), [Ops route-by-route reference](../apps/ops/route-by-route-reference.md), [Ops SOS guide](../apps/ops/sos-and-reassignment-guide.md), [Employee commuter guide](../apps/employee-app/commuter-feature-guide.md), [Employee API matrix](../apps/employee-app/service-api-matrix.md), [Employee routes](../apps/employee-app/exact-route-inventory.md), and [Mobile routes](../apps/mobile/exact-route-inventory.md) | `CorporateTrackingController`, `CorporateSafetyController`, `CorporateSupportTicketController`; see [API endpoint appendix](../apps/api/reference/exact-controller-endpoints.md) and [Corporate API reference](../apps/corporate/api-reference.md) | `corporate-tracking.service.ts`, `corporate-gps-ingest.service.ts`, `corporate-safety.service.ts`, `corporate-support-ticket.service.ts` under `apps/api/src/domains/corporate/` | `CorporateVehiclePosition`, `CorporateSosAlert`, `CorporateSupportTicket`, `CorporateTripEvent` | Partial — Employee SOS/tracking and support calls are source-mapped; SOS coordinate fallback, runtime/device and test evidence remain; Corporate live/safety route blockers are separately documented |
| `FEATURE-MARKETING-CONTENT-LEADS` | Public product pages, blog content and lead capture | [21-route page reference](../apps/marketing/detailed-page-reference.md), [component catalog](../apps/marketing/component-feature-catalog.md), [lead conversion guide](../apps/marketing/lead-conversion-guide.md), [SEO/publishing guide](../apps/marketing/seo-and-publishing-guide.md) and [exact inventory](../apps/marketing/exact-page-inventory.md) | `BlogsController`, `LeadsController`; see [API endpoint appendix](../apps/api/reference/exact-controller-endpoints.md) | `apps/api/src/modules/blogs/blogs.service.ts`, `apps/api/src/modules/leads/leads.service.ts` | `BlogPost`, `LeadCapture` | Partial — page/component/request/data paths are source-mapped. Lead contract defects and lack of consent/analytics UI are documented; runtime, public-claim and test evidence remain. |
| `FEATURE-ADMIN-PLATFORM` | Platform support, configuration and administration | [Admin routes](../apps/admin/exact-route-inventory.md) | `AdminController`, `FeatureFlagsController`; see [API endpoint appendix](../apps/api/reference/exact-controller-endpoints.md) | `apps/api/src/modules/admin/admin.service.ts` and `apps/api/src/modules/feature-flags/` | `AuditLog`, `FeatureFlag`, `SystemPolicyConfig`, `User` | Partial — page-specific endpoint and authorization/data effects remain |

## API controller coverage

The 44 source controllers and their method/path mappings are listed in the
[exact controller endpoint appendix](../apps/api/reference/exact-controller-endpoints.md).
The appendix supplies controller-source evidence for each expanded row.
The [complete controller and service inventory](../apps/api/reference/complete-controller-inventory.md)
provides additional module/service grouping. Neither inventory alone is a
complete endpoint contract.

## Sources and verification

- `apps/admin/src/app/**/page.tsx`, `apps/ops/src/app/**/page.tsx`, `apps/corporate/src/app/**/page.tsx` — Next.js route source counts.
- `apps/mobile/lib/routes/app_routes.dart`, `apps/employee_app/lib/routes/app_routes.dart` — Flutter route constants.
- `apps/marketing/src/pages/` — Astro/TypeScript page and endpoint source count.
- `apps/api/src/**/*.controller.ts` — controller and HTTP method decorator counts.
- `apps/api/prisma/schema.prisma` — Prisma model count and model declarations.
