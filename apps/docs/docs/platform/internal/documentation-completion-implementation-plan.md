---
title: Documentation Completion Implementation Plan
description: Phased plan to complete the evidence-based AdhocX documentation system.
---

# Documentation Completion Implementation Plan

## Purpose

This plan converts the full documentation audit into a controlled,
phase-based implementation program. It ensures that a developer joining
AdhocX can understand the system from business purpose to source
implementation.

## Mandatory Workflow

Implementation must use one approved phase at a time:

1. I present the next phase scope.
2. I complete only that phase.
3. I validate the phase deliverables.
4. I report modified and created files.
5. I stop and wait for approval.
6. The user explicitly replies `PROCEED` before the next phase starts.

Statements such as "looks good" or "thanks" do not authorize the next phase.

## Current Execution Status

| Phase | Status | Notes |
|---|---|---|
| 1 — Curated Information Architecture | Completed | Curated navigation, public status/dashboard, page template, ownership guidance, historical completion-claim reconciliation, Docusaurus production build and TypeScript check completed. |
| 2 — Traceability and Coverage Registry | Completed | Stable application/domain/module/feature IDs, feature traceability matrix, status catalog and missing-item report added. Reconciled 124 Next.js pages, 217 Flutter route constants, 21 Marketing files, 44 controller source files, 431 decorators and all 75 Prisma models. Phase 3 AST validation corrected the prior regex appendix count to 50 controller classes and 436 controller/method path variants. |
| 3 — API Endpoint Reference Expansion | Completed | Completed after explicit approval. Added 50 controller pages and a class-aware index reconciling 44 source files, 50 decorated classes, 431 method decorators and 436 path variants; added the 179-type DTO catalog, error catalog, webhook/idempotency guide and troubleshooting guide. Corrected the prior regex-generated 491-row count. Docusaurus production build (no broken links/anchors), TypeScript check, inventory reconciliation and `git diff --check` passed. Endpoint pages intentionally remain Partial where deeper downstream behavior or runtime evidence is not statically proven; the service inventory is now covered in Phase 5, while exact endpoint flows and runtime evidence remain for application-specific phases and Phase 14. |
| 4 — Database Data Dictionary | Completed | Documented all 75 models, 42 enums, 1,272 fields, 220 relation fields, 157 model-level key/index declarations, 33 migration directories and tenant isolation evidence. Docusaurus build, TypeScript check, inventory reconciliation and `git diff --check` passed; live DB state was not introspected. |
| 5 — Backend Module and Service Reference | Completed | Documented all 29 feature-module files, all 78 service files, all four adapter files, module wiring, representative data/provider behavior, Corporate workflows, scheduler/realtime infrastructure, and wiring caveats for standalone use cases. Source inventory reconciliation, Docusaurus production build, TypeScript check and `git diff --check` passed. Exact endpoint-to-service/data flows remain Partial and are tracked in the gap report. |
| 6 — Admin Route-by-Route Documentation | Completed | Completed after explicit approval. Added a 30-route functional/technical reference, corrected the route inventory and existing Admin references, and documented actual API helpers, controller links, data boundaries, redirects, authorization boundaries and source caveats (including `/users` alias and login MFA gap). All 30 page paths reconcile; Docusaurus build, TypeScript check and `git diff --check` passed. Runtime URLs and some field-level/audit evidence remain Partial for Phase 14. |
| 7 — Ops Route-by-Route Documentation | Completed | Approved by the user. Added a 29-route functional/technical reference, corrected the inventory for four redirects and eight Corporate Safety re-exports, and added live operations and SOS/reassignment guides. All page paths and safety/live API references reconcile; Docusaurus build, TypeScript check and `git diff --check` passed. Runtime URLs and additional endpoint/test evidence remain Partial for Phase 14. |
| 8 — Corporate Route-by-Route Documentation | Completed | Completed after explicit approval. Added the functional/technical reference for all 65 Corporate page paths, exact runtime inventory, API and workflow references, troubleshooting, architecture and permissions/tenant-scope updates. Source audit found four nested layouts redirecting `/live/**`, `/bookings/**`, `/rosters/**` and `/safety/**` to `/dashboard`; documented these pages as source-implemented but currently unreachable. Both route references reconcile to all 65 source pages. Docusaurus production build, docs TypeScript check and `git diff --check` passed. Runtime URL, endpoint-specific validation/audit and test evidence remain Partial for Phase 14. |
| 9 — Mobile Screen and Feature Documentation | Completed | Completed after explicit approval. Mapped all 172 named constants (107 canonical paths and 65 aliases) to GoRouter screen sources or redirect behavior, documented 119 registered GoRoute entries and dynamic aliases, added driver/vendor workflow guides, screen/component catalog and service/API matrix, and reconciled all 280 Dart files by feature directory. Corporate ETS driver screens are documented as source-present but unregistered. Docusaurus build, docs TypeScript check, route/source reconciliation and `git diff --check` passed. Device/runtime and test evidence remain for Phase 14. |
| 10 — Employee Screen and Feature Documentation | Completed | Completed after explicit approval. Mapped all 131 named constants (110 canonical paths and 21 aliases) to 110 registered GoRoute entries and screen sources/redirects; added commuter feature, screen/component, provider and service/API references; reconciled all 197 Dart library files by directory. Documented Employee-specific limitations including local-only OTP/QR boarding, safe-reach missing-ID success handling and SOS coordinate fallback. The full Flutter test suite passed in an isolated copy (305 passed, 14 skipped); Docusaurus build, docs typecheck, route/source reconciliation and `git diff --check` passed. Runtime/device and route-to-test evidence remain for Phase 14. |

| Phase | Status | Notes |
|---|---|---|
| 11 — Marketing Application Documentation | Completed | Source-audited and documented all 21 Marketing route files, page/component behavior, lead flow, SEO/publishing and deployment configuration. Both route tables reconcile to all 21 source files. Marketing production build generated 25 HTML pages; Docusaurus build, docs typecheck, SEO check and `git diff --check` passed. The seven blog-image dimension warnings and source-grounded form/API caveats are documented. |
| 12 — ETS Current/Planned/History Separation | Completed | Added current-state overview, implementation status matrix, module/API and workflow maps; separated historical specifications/audits from roadmaps; labeled legacy 00–22 material by evidence class; corrected cross-reference paths and clarified repository-only audits excluded from the public site. Docusaurus production build, docs typecheck and `git diff --check` passed. The first build exposed links to intentionally excluded `internal/` pages; the archive now identifies those as repository-only without linking them. Phase 13 began only after its separate user-approval gate was accepted. |
| 13 — Architecture Diagrams and ADRs | Completed | Added source-mapped system, workspace, deployment and Corporate API component views; request and GPS telemetry sequences; selected ETS ERD; diagram style guide; and four source-observed ADRs with index/changelog. Mermaid was enabled in Docusaurus and checked in the production build and browser. Native Mermaid C4 context raised a browser runtime error, so the C4-level views use the working flowchart renderer and explain that limitation. Production docs build, typecheck and `git diff --check` passed. Actual production deployment/provider state remains unverified. |
| 14 — Testing and Browser QA Documentation | Completed | Audited package scripts, 116 API unit specs, one dispatch integration simulation, nine shared-package specs, 54 Flutter test files, three unintegrated frontend source-regression scripts, CI workflows, Marketing SEO behavior and Docusaurus link handling. Added the QA overview, coverage/ownership matrix, browser plan, Flutter device matrix and safe execution runbook; labeled the old testing strategy as a proposal. Found that API `test:e2e` references a missing config, Flutter `pnpm test` scripts are placeholders, browser/device automation is absent, and no formal test owners are assigned. Validation commands, source-backed gaps and manual recommendations are documented without claiming unrun suites passed. |
| 15 — Deployment, Recovery and Operations Runbooks | Completed | Reconciled production/local Compose, Nginx routing, Dockerfiles, CI/CD/AWS/Cloudflare/Mobile workflows, health probe semantics, Prisma migrations, EC2 provisioning and audit-evidence requirements. Added deployment boundaries, CI/CD inventory, database migration/backup guidance, TLS/DNS, Mobile release, health/recovery and incident/escalation pages; relabeled old DevOps/observability strategy documents as proposals. Recorded conflicting AWS deployment paths, `db push --accept-data-loss`, sensitive fallback defaults, self-signed certificate behavior, missing backup/restore evidence and absent on-call ownership. No cloud deployment, production migration, certificate change or backup/restore was executed. Docusaurus build/typecheck and source/whitespace checks passed. |

## Application Inventory

The repository contains eight runnable workspaces:

| Application | Type | Documentation status |
|---|---|---|
| API | NestJS backend | Broad overview complete; route/component detail incomplete |
| Admin | Next.js frontend | Sparse |
| Ops | Next.js frontend | Sparse |
| Corporate | Next.js frontend | Moderate, route detail incomplete |
| Mobile | Flutter application | Source-mapped route, screen, feature and API documentation complete for Phase 9; runtime/device and test evidence remain |
| Employee App | Flutter application | Source-mapped route, screen, feature, provider and API documentation complete for Phase 10; runtime/device and route-to-test evidence remain |
| Marketing | Astro application | Sparse |
| Documentation | Docusaurus application | Foundation, curated navigation and ownership guidance implemented; application behavior coverage remains partial |

ETS is a business domain spanning API, Corporate, Employee, Mobile and Ops.
It is not a ninth runnable application.

## Baseline Audit Findings

The following gaps describe the original audit baseline; later phase
deliverables may resolve or narrow individual items. The status table above
and documentation dashboard are the current completion indicators.

### Structural Findings

1. The original autogenerated navigation was replaced by a curated sidebar in Phase 1; keep navigation ownership documented and maintained.
2. Current-state documentation is mixed with plans and audits.
3. Route inventories identify paths but do not explain every route fully.
4. API controller, route and DTO declarations now have static references; complete downstream business/data traces and runtime route verification remain.
5. The database inventory lacks a complete field-level data dictionary.
6. Mobile and Employee documentation does not cover every screen/module.
7. Corporate documentation is missing many individual route explanations.
8. Admin and Ops route documentation is sparse.
9. Marketing component/SEO/lead behavior is incomplete.
10. ETS roadmap documents are not clearly separated from current behavior.

### Verification Findings

| Area | Evidence available | Remaining work |
|---|---|---|
| API | 44 controller files, 50 decorated classes, 431 method decorators and 436 AST-derived path variants | Complete downstream service/data behavior, runtime URL verification and endpoint-specific execution examples |
| Database | 75 Prisma models | Field dictionary, relationships and migrations |
| Next.js | 124 route pages | Route-by-route functional/technical pages |
| Mobile | 280 Dart files | Screen/provider/service/component reference |
| Employee | 197 Dart files | Screen/provider/repository/component reference |
| Marketing | 21 Astro/TS pages | Page/component/lead/SEO reference |
| Testing | 116 API `*.spec.ts`, one API `*.int-spec.ts`, nine shared-package specs, 54 Flutter test files and three standalone frontend Node test files | Audited QA matrix, browser plan, device matrix and execution runbook; actual feature coverage and runtime/device results remain partial |

## Documentation Quality Requirements

Every completed document must answer:

### Functional Perspective

- What does this item do?
- Why is it required?
- Which business users need it?
- What information is displayed or collected?
- What actions can a user perform?
- What workflow occurs after an action?
- What validations and business rules apply?
- How does it connect to other modules?
- What states and failure conditions are possible?

### Technical Perspective

- Which source file implements it?
- Which component/screen owns the UI?
- Which route or API is used?
- Which request payload and response are exchanged?
- Which controller and service handle it?
- Which database model and fields are read or changed?
- Which guard, interceptor or permission applies?
- Which provider or SDK is used?
- What happens after success or failure?

Every end-to-end feature page should use:

```text
User action
→ Frontend route/component
→ State/provider/repository
→ API request
→ Controller
→ Guard/validation
→ Service/business logic
→ Provider and/or Prisma
→ Database/external service
→ API response
→ Frontend state update
→ User-visible result
```

## Required Deliverable Types

Create or update pages using these structures where appropriate:

- Application overview
- Route reference
- Feature reference
- Component reference
- Module reference
- Service reference
- API endpoint reference
- DTO/data-contract reference
- Database data-dictionary page
- Sequence/workflow page
- User guide
- Troubleshooting/runbook
- ADR and decision log
- Ownership and review procedure

## Phase Plan

### Phase 1 — Curated Information Architecture

**Scope**

- Replace the fully autogenerated sidebar with a curated navigation structure.
- Separate Applications, Platform, APIs, Workflows, Operations and Governance.
- Separate current state, roadmap and historical/audit documents.
- Add public status and completeness pages.
- Add consistent page metadata and status conventions.
- Add next/previous navigation and source reference blocks.

**Deliverables**

- Curated `sidebars.ts`
- Documentation status page
- Public completion dashboard
- Page template
- Navigation ownership guide

**Validation**

- Docusaurus production build
- All primary documentation areas reachable
- Internal and planned pages correctly separated

**Approval gate**

Stop and require `PROCEED` before Phase 2.

### Phase 2 — Traceability and Coverage Registry

**Scope**

- Create the feature-to-route-to-API-to-service-to-database matrix.
- Assign stable documentation IDs to major modules and features.
- Map 124 Next.js routes.
- Map Flutter route constants.
- Map 21 Marketing pages.
- Map 431 API route decorators.
- Map 75 Prisma models.
- Identify verified, partial and missing coverage.

**Deliverables**

- Coverage registry
- Feature traceability matrix
- Documentation status catalog
- Missing-item report

**Validation**

- Source inventory reconciles with route/controller/model counts
- No major application omitted
- Every registry row identifies status and evidence

**Approval gate**

Stop and require `PROCEED` before Phase 3.

### Phase 3 — API Endpoint Reference Expansion

**Scope**

- Document each API route with purpose and actors.
- Add HTTP method, payload, response and validation details.
- Add controller, service and Prisma interactions.
- Add role, JWT and corporate-tenant authorization.
- Add success and failure examples.
- Add provider and Redis behavior.
- Group aliases and deprecated endpoints explicitly.

**Deliverables**

- API endpoint reference pages
- Request/response DTO catalog
- Error-code catalog
- Idempotency and webhook reference
- API troubleshooting page

**Validation**

- Route inventory reconciles with controller source
- Payload and response details agree with DTO/source
- Broken links and Swagger references pass

**Approval gate**

Stop and require `PROCEED` before Phase 4.

### Phase 4 — Database Data Dictionary

**Scope**

- Document all 75 Prisma models.
- Document all 42 Prisma enums and their field usage.
- Document important fields and types.
- Document primary, foreign and unique keys.
- Document relationships and cascade behavior.
- Document indexes and hot paths.
- Reconcile all 33 checked-in migrations and explain custom SQL not represented by Prisma.
- Document data ownership, tenant-scoped identifiers and application-level isolation boundaries.
- Split ERDs by bounded context.

**Deliverables**

- Data dictionary
- Bounded-context ERDs
- Migration and retention guide
- Tenant data-isolation map

**Validation**

- Model count reconciles with schema
- Field, enum and migration-directory inventories reconcile with source
- Relationships reconcile with Prisma
- No secrets or private values appear
- Docusaurus production build, TypeScript check and `git diff --check` pass

**Validation outcome:** The generated Prisma DMMF reconciled all 75 model
names and field names with `apps/api/prisma/schema.prisma`; the dictionary
contains 1,272 fields, and all 42 enums and 33 checked-in migration
directories are represented. `npm.cmd run build`, `npm.cmd run typecheck`
and `git diff --check` passed. No live database was queried, so deployed
schema drift and applied migration state remain unverified.

**Approval gate**

Stop and require `PROCEED` before Phase 5.

### Phase 5 — Backend Module and Service Reference

**Scope**

- Document Identity, Fleet, Marketplace, Dispatch, Trip, Finance,
  Platform and Corporate modules.
- Explain every module, submodule, service and provider adapter.
- Explain application use cases and infrastructure repositories.
- Document schedulers, Redis and realtime services.
- Trace services to database and external providers.

**Deliverables**

- Module reference
- Service reference
- Provider adapter reference
- Component dependency diagrams
- Backend troubleshooting pages

**Validation**

- Module/service inventory reconciles with source folders
- Cross-links and diagrams match implementation
- Docusaurus production build, TypeScript check and `git diff --check` pass

**Validation outcome:** The module/service references cite all 78
`*.service.ts` files, and the provider reference cites all four
`*.adapter.ts` files; the 29 feature-module files were also reconciled against
the API source inventory. `npm.cmd run build`, `npm.cmd run typecheck` and
`git diff --check` passed. The build reported no broken links or anchors.
Standalone use cases are explicitly distinguished from the registered
request path where source wiring was not found.

**Approval gate**

Stop and require `PROCEED` before Phase 6.

### Phase 6 — Admin Route-by-Route Documentation

**Scope**

Document all 30 Admin routes:

- Functional purpose
- Target user
- Displayed data
- Available actions
- Components/state
- API request
- Controller/service
- Database effects
- Validation
- Success/failure behavior
- Authorization/audit

**Deliverables**

- 30 route or consolidated route-group pages
- Admin feature index
- Admin troubleshooting section

**Validation**

- Every `apps/admin/src/app/**/page.tsx` has coverage
- Route files and links reconcile
- Docusaurus production build, TypeScript check and `git diff --check` pass

**Validation outcome:** The route reference maps all 30 Admin `page.tsx`
files to a route row with no missing or extra source paths. The Docusaurus
production build generated successfully with no broken links, TypeScript
checking passed, and `git diff --check` passed. The guide explicitly marks
source/runtime boundaries and unsupported or redirect-only routes instead of
claiming unverified behavior.

**Approval gate**

Stop and require `PROCEED` before Phase 7.

### Phase 7 — Ops Route-by-Route Documentation

**Scope**

Document all 29 Ops routes:

- Live fleet and route behavior
- Dispatch/reassignment operations
- Tenant selection
- SOS and incident lifecycle
- Tracking freshness
- Support ticket operations
- Component/API/database flow

**Deliverables**

- 29 route or consolidated route-group pages
- Live operations runbook
- SOS and reassignment guide

**Validation**

- Every `apps/ops/src/app/**/page.tsx` has coverage
- Safety and live routes reconcile with API

**Validation outcome:** The route catalog contains one row for each of the
29 source page files. Its entries identify redirect-only routes and Corporate
Safety re-exports, and the live tracking, SOS, routing, dispatch and support
references match the Ops API helper paths. The detailed route reference,
runbook, SOS/reassignment guide, application entry pages, inventory,
completion dashboard, missing-docs report and traceability registry were
updated together. Docusaurus production build, TypeScript checking,
route-source reconciliation and `git diff --check` passed. This validates
the checked-in source documentation, not deployed runtime URLs or live
database state.

**Approval gate**

Stop and require `PROCEED` before Phase 8.

### Phase 8 — Corporate Route-by-Route Documentation

**Scope**

Document all 65 Corporate routes:

- Dashboard and analytics
- Employees and offices
- Rosters and bookings
- Route/live/tracking views
- Safety/support
- Billing/disputes
- Settings and notifications
- Corporate permissions and tenant scope

**Deliverables**

- 65 route or grouped route-module pages
- Corporate workflow guides
- Corporate route troubleshooting

**Validation**

- Every `apps/corporate/src/app/**/page.tsx` has coverage
- Route/API/database/role relationships are traceable

**Validation outcome:** Both `exact-route-inventory.md` and
`detailed-route-reference.md` contain exactly one route entry for each of the
65 Corporate source page paths. The detailed reference explains the frontend
page behavior and source-visible API/backend/data connections; the API
reference, workflow guide, troubleshooting guide, permissions guide and
architecture page add cross-cutting details. The audit found the nested layout
redirects for live, bookings, rosters and safety, plus redirects/aliases and
other source-level caveats, and the documentation distinguishes source
implementations from pages reachable in the current route tree. `npm run
build`, `npm run typecheck` and `git diff --check` passed in `apps/docs`.
Deployed runtime behavior, endpoint-specific validation/audit details and
test coverage are not certified by these checks and remain for Phase 14.

**Approval gate**

Stop and require `PROCEED` before Phase 9.

### Phase 9 — Mobile Screen and Feature Documentation

**Scope**

Document the vendor and driver application:

- Authentication/onboarding
- KYC and vehicle
- Requirements and fulfillment
- Offers and dispatch
- Trips and OTP
- Wallet/payments/earnings
- Referrals and notifications
- Corporate driver duties
- State/providers/services
- Reusable widgets/components
- Android/iOS/web differences

**Deliverables**

- Mobile application guide
- Vendor feature guide
- Driver feature guide
- Screen/component catalog
- Service/API matrix

**Validation**

- Major route constants map to screens
- Services map to API endpoints
- 280 Dart files are grouped and covered

**Validation outcome:** The exact route inventory reconciles all 172 named
constants: 107 canonical path constants and 65 aliases. One canonical pair
shares `/sign-in`, leaving 106 unique canonical paths. The current router has 119
registered `GoRoute` entries, including dynamic deep-link/compatibility paths.
The [screen/component catalog](../../apps/mobile/screen-component-catalog.md)
groups all 280 Dart files by source directory and feature responsibility. The
[driver guide](../../apps/mobile/driver-feature-guide.md), [vendor
guide](../../apps/mobile/vendor-feature-guide.md) and [service/API
matrix](../../apps/mobile/service-api-matrix.md) trace principal user actions
through providers/services to endpoint and backend/data areas. The audit found
that Corporate ETS active-route source is not registered in the app router.
The Docusaurus production build and docs TypeScript check passed. Reconciliation
confirmed that all 172 source constants appear exactly once in the canonical or
alias inventory, all 79 referenced screen source files exist, and the router
contains 119 `GoRoute` entries. `git diff --check` and trailing-whitespace
checks passed. Device/runtime behavior and test coverage remain open for
Phase 14.

**Approval gate**

Stop and require `PROCEED` before Phase 10.

### Phase 10 — Employee Screen and Feature Documentation

**Scope**

Document all Employee routes and feature areas:

- Authentication and onboarding
- Schedule and trip state
- Live tracking
- Boarding OTP/QR
- Safe reach
- Safety/SOS
- Support
- History/feedback
- Profile/settings/notifications
- Providers/repositories/API client

**Deliverables**

- Employee commuter guide
- Employee route/screen catalog
- State/provider catalog
- Repository/API matrix

**Validation**

- All canonical route constants and aliases reconcile to registered route behavior
- 197 Dart files are grouped and covered by source area
- API mapping reconciles with Corporate Rider, execution, safety and support APIs

**Validation outcome:** The route map reconciles 131 named constants: 110
canonical literal paths plus 21 aliases. All 110 paths have a registered
GoRoute entry; `/login-options` and `/company-sso` redirect to `/mobile-number`.
All 109 referenced screen source files exist. The codebase contains 197 Dart
files under `lib/`, grouped in the catalog by directory. Repository methods
were checked against Auth, Corporate Rider, trip-execution, safety,
support-ticket, routing and notification controllers. The full Flutter test
suite passed in an isolated workspace copy: 305 passed, 14 skipped. Running it
in the original OneDrive-backed app directory first failed during Flutter's
attempt to remove a generated reparse-point test-assets directory; the
isolated-copy run completed successfully. Docusaurus production build, docs
typecheck, exact route reconciliation and `git diff --check` passed. The audit
identified and documented unverified device/runtime behavior, OTP/QR
verification mismatch, safe-reach missing-ID success path and SOS location
fallback; no claim is made that these are fixed.

**Approval gate**

Stop and require `PROCEED` before Phase 11.

### Phase 11 — Marketing Page and Component Documentation

**Scope**

Document all 21 Astro/TS routes and React islands:

- Header/footer/mobile navigation
- Estimator/calculators
- Lead forms
- FAQ
- Blog/RSS/sitemap
- JSON-LD/SEO/canonical behavior
- Lead API payload
- Cloudflare/Vercel deployment

**Deliverables**

- Marketing page catalog
- Component catalog
- SEO guide
- Lead conversion guide

**Validation**

- Every page in `apps/marketing/src/pages` has coverage
- Component/API/SEO links reconcile

**Validation outcome:** The 21 source entries (19 Astro pages and 2 TypeScript
endpoints) are cataloged. Page-purpose/API/data mappings, shared and
interactive component behavior, lead request/validation/storage, static blog
generation, SEO and deployment configuration are source-mapped. The public
form's `inquiryPurpose`/DTO mismatch, contact-name mapping, network-failure
success state, local-only calculators and external browser-side AI integration
are recorded as implementation caveats, not fixes. Marketing production build
passed and generated 25 HTML pages (including seven article slugs) plus RSS
and sitemap endpoints. The postbuild SEO check passed with seven warnings for
blog images without explicit width/height. Docusaurus production build,
documentation TypeScript check, reconciliation of 21 source files against
both 21-row route tables (zero missing files), and `git diff --check` passed.
Deployed endpoint behavior, browser interaction and the marketing claims were
not runtime-verified.

**Approval gate**

Stop and require `PROCEED` before Phase 12.

### Phase 12 — ETS Current/Planned/History Separation

**Scope**

- Mark implemented, partial and planned functionality.
- Separate roadmap and audit documents.
- Reconcile master plans, DDD plans and completion plans.
- Add current-state ETS workflow pages.
- Label historical documents.

**Deliverables**

- ETS current-state index
- ETS implementation status matrix
- Historical archive
- Roadmap archive

**Validation**

- No roadmap page is presented as verified behavior
- ETS pages reconcile with API/Corporate/Employee/Mobile/Ops

**Validation outcome:** The current overview, matrix, module/API map and
workflow map distinguish source-present/partial evidence from planned and
historical claims. The historical archive covers specifications 00–15 and
dated audits 18 and 21; the roadmap archive covers DDD plans 16–17 and
implementation records 19, 20 and 22. Legacy application/backend specifications
carry historical banners, DDD documents are marked as target proposals, and
dated records are explicitly snapshots. Links to the two `internal/` audit
files were removed from the public-facing archive because Docusaurus excludes
that directory; the archive still records their repository paths and status.
The Docusaurus production build, docs TypeScript check and `git diff --check`
passed. This validates documentation rendering and static types, not production
provider behavior or runtime acceptance, which remain unverified in the
[ETS implementation status matrix](../../apps/ets/implementation-status.md).

**Approval gate**

Stop and require `PROCEED` before Phase 13.

### Phase 13 — Architecture Diagrams and ADRs

**Scope**

- C4 context, container and component diagrams
- Deployment diagram
- Sequence diagrams
- ERDs
- Event/data-flow diagrams
- ADR directory
- Architecture decision changelog

**Deliverables**

- Architecture reference
- ADR index
- Decision changelog
- Diagram style guide

**Validation**

- Mermaid renders in production build
- Diagrams reconcile with source

**Validation outcome:** Mermaid was enabled through
`@docusaurus/theme-mermaid`, with the renderer and optional ELK layout
dependency pinned to compatible versions. Docusaurus production build and
TypeScript checks passed. Browser inspection confirmed the context/container
and deployment/component flowcharts, protected-request and GPS sequences, and
ETS ERD render. Native Mermaid `C4Context` produced a browser
`e.transition is not a function` error; the C4 context-, container- and
component-level views were changed to labeled Mermaid flowcharts instead, and
the limitation is documented in the diagram guide. Source reconciliation
covered `main.ts`, `AppModule`, Corporate domain/tracking modules, the
production Compose and Nginx files, Redis Pub/Sub/stream implementation and
selected Prisma relations. The four ADRs record current source-observed
architecture, not claimed historical approval rationale. Production
deployment, provider availability and live database state remain unverified.
The final Docusaurus production build, docs typecheck and `git diff --check`
passed.

**Approval gate**

Stop and require `PROCEED` before Phase 14.

### Phase 14 — Testing and Browser QA Documentation

**Scope**

- Document unit/integration/API/E2E/load tests.
- Document Admin/Ops/Corporate browser test strategy.
- Document Marketing browser and SEO testing.
- Document Docusaurus visual/link validation.
- Document Mobile/Employee test-device matrix.
- Add coverage gaps and test ownership.

**Deliverables**

- QA matrix
- Browser test plan
- Device test matrix
- Test execution runbook

**Validation**

- Commands reconcile with package scripts and CI
- Test gaps are explicit

**Completion record**

Completed after explicit approval. The [testing overview](../engineering/testing-overview.md),
[coverage and ownership matrix](../engineering/test-coverage-matrix.md),
[browser QA plan](../engineering/browser-qa-plan.md),
[Mobile/Employee device matrix](../engineering/mobile-device-test-matrix.md),
and [execution runbook](../engineering/test-execution.md) distinguish test
files from executed evidence and recommendations from implemented automation.
The inventory reconciles to 116 API `*.spec.ts` files and one
`*.int-spec.ts`, nine shared-package Jest specs, 31 Mobile and 23 Employee
Flutter test files, and three standalone Admin/Ops/Corporate Node test files.
The audit also confirmed that the API `test:e2e` target references a missing
config, Flutter package `test` scripts are placeholders, no frontend browser
automation or Flutter test CI job is configured, and no formal test owner
registry is checked in.

Docusaurus production build and TypeScript check passed, as did
`git diff --check`. This validates the documentation bundle and its types;
it does not assert that every product test suite, browser journey, provider or
device passed.

**Approval gate**

Stop and require `PROCEED` before Phase 15.

### Phase 15 — Deployment, Recovery and Operations Runbooks

**Scope**

- Docker and Nginx
- AWS/Cloudflare deployment
- Database migration and rollback
- Certificate/DNS procedures
- Mobile release
- API/PostgreSQL/Redis outage
- SOS/dispatch/payment/storage incidents
- Backup and restore rehearsal
- On-call and escalation

**Deliverables**

- Operator handbook
- Incident runbooks
- Recovery checklists
- Release procedures

**Validation**

- Runbooks reconcile with Compose/workflows
- Commands and health endpoints validated

**Completion record**

Completed after explicit approval. The
[deployment overview](../operations/deployment-overview.md),
[CI/CD inventory](../operations/ci-cd.md),
[database migration/backup runbook](../operations/database-migrations-and-backups.md),
[TLS/DNS guide](../operations/tls-dns-and-certificates.md),
[Mobile release runbook](../operations/mobile-release-runbook.md),
[health/recovery guide](../operations/health-and-recovery.md), and
[incident/escalation guide](../operations/incident-response-and-escalation.md)
map the checked-in Compose, Nginx, Dockerfiles, workflows and health
implementation. The older DevOps and observability strategy pages are now
explicitly distinguished from implemented behavior.

The source audit found multiple AWS deployment paths with different
migration failure semantics, sensitive literal fallbacks in the EC2
workflow, a self-signed certificate fallback without renewal automation,
and no checked-in production backup schedule, completed restore log, DNS
automation or on-call rota. These are documented as blockers or unverified
operations; no credentials or fallback values are reproduced. The migration
verifier and health endpoints were checked against source, not run against
production. No deployment, production migration, certificate change or
backup/restore exercise was performed.

Docusaurus production build and TypeScript check passed, as did
`git diff --check`. Runbook commands and source links were reconciled with
the repository; this does not certify live infrastructure or a production
recovery capability.

**Approval gate**

Stop and require `PROCEED` before Phase 16.

### Phase 16 — Governance, Automation and Final Audit

**Scope**

- Add source edit links and evidence ownership.
- Add stale-document detection.
- Add route/API/data coverage script.
- Add automated Mermaid/link/secret/build checks.
- Add ADR and decision-log procedures.
- Perform final app/route/API/database audit.

**Deliverables**

- Documentation governance
- Coverage automation
- Final completeness report
- Public status dashboard

**Validation**

- Docusaurus production build passes
- Internal links pass
- No public secrets
- Coverage report reconciles with source

**Phase 16 implementation record**

- Added Docusaurus GitHub edit links and strict Markdown-link handling.
- Added a public documentation governance page with evidence ownership,
  review cadence, decommissioning and internal/public boundaries.
- Added an ADR process and reusable ADR template.
- Added `apps/docs/scripts/check-documentation.mjs`, exposed as
  `pnpm --filter @adhocx/docs check:docs`.
- The checker reconciles Next.js, API controller, Marketing, Prisma and Flutter
  route/model source inventories against documentation.
- The checker reports public stale-review metadata, selected secret formats,
  unclosed Mermaid fences and source-coverage gaps.
- Added a dedicated documentation-quality CI job for the checker, TypeScript
  check and Docusaurus production build.
- Repaired malformed Mermaid sequence/state syntax found by source audit.

Runtime inventory coverage remains deliberately separate from runtime behavior:
source reconciliation proves that an item is represented, not that it has been
executed or completely traced. The final report retains the remaining
provider, device, browser, test, secret-management and live-infrastructure
verification gaps instead of marking them complete.

**Approval gate**

Phase complete; present final audit and stop.

## Status Definitions

| Status | Meaning |
|---|---|
| Not Started | No implementation or source-derived page |
| Incomplete | Some inventory exists but functional/technical detail is sparse |
| In Progress | Phase implementation is active |
| Needs Review | Implemented but requires technical validation |
| Completed | Implemented, source-linked and validation passed |
| Blocked | Missing evidence or unresolved business decision |

## Per-Phase Report Template

Every completed phase must report:

1. Phase name and scope
2. Files created
3. Files modified
4. Source evidence used
5. Functional deliverables
6. Technical deliverables
7. Validation results
8. Pending questions or unresolved items
9. Confirmation that no unrelated files changed

At the end of each completed phase:

**“Phase X is complete and validated. Shall I PROCEED with Phase X+1?”**
