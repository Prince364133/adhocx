---
title: Documentation Coverage Matrix
description: Evidence-based application and topic coverage with known gaps.
status: partial
last_reviewed: "2026-11-23"
---

# Documentation Coverage Matrix

This matrix describes the depth of documentation currently available. It
does not claim that every route or feature is complete. See the
[status definitions](./documentation-status.md) and
[completion dashboard](./completion-dashboard.md) for interpretation and
application-level summary. The [traceability registry](./traceability-registry.md)
records stable feature IDs and source count reconciliation.

## Application coverage

| Application/domain | Overview and architecture | Routes/features | API/data trace | Status |
|---|---|---|---|---|
| API | Overview and architecture references exist | AST-derived controller pages cover route declarations; full workflow behavior remains partial | Data/model inventories exist; nested service and complete persistence traces remain | Partial / Inventory |
| Admin | Application overview exists | Route and feature references exist; individual validation is incomplete | API integration and persistence detail need route-level tracing | Partial / Inventory |
| Ops | Application overview exists | Route inventory and operational feature references exist | Authorization, API, data and failure paths need additional tracing | Partial / Inventory |
| Corporate | Architecture, permissions and workflows are documented | Route inventories and detailed route reference exist; per-route verification remains | API/data behavior requires more granular tracing | Partial / Inventory |
| Employee App | Commuter feature guide, architecture and workflow references | All 110 canonical paths and 21 aliases; 110 GoRoute destinations mapped to screen sources | Provider/cache behavior, repository calls, backend controllers/services/data areas and known wiring gaps are source-mapped; runtime/device and route-to-test evidence remain | Partial / Source-mapped |
| Mobile | Application and compliance references exist | Flutter route inventory and grouped route reference exist | Per-screen service, SDK, API and data traces remain | Partial / Inventory |
| Marketing | Astro/React architecture, publishing and integration paths are documented | All 21 page/endpoint routes and shared/interactive components are source-mapped | Lead payload/validation/persistence, blog build-time API usage, SEO output and deployment configuration are documented; API-contract, runtime and marketing-claim verification remain | Partial / Source-mapped |
| Documentation | Docusaurus overview, standards, navigation and governance exist | Curated navigation and page template added in Phase 1 | Build validates docs output; application behavior coverage does not apply | Partial |
| ETS domain | Current-state overview, implementation status matrix, source module/API map and workflow references | Cross-application route/API documentation is linked; old app/backend specs are labeled as historical, while DDD and completion plans are separated as proposals/snapshots | Production/provider parity and remaining endpoint/test evidence still require verification | Partial / Source-mapped |
| System architecture | [Context, container, deployment, component, data-flow and selected ERD views](./architecture/index.md); four [architecture decision records](./architecture/decisions/index.md) | Source paths, Compose boundaries, representative API/telemetry flow and selected Prisma relations are explained | Production inventory and provider availability are not verified; diagrams cover selected paths, not every route or model | Partial / Source-mapped |

## Domain coverage

| Domain | Inventory evidence | Functional/technical explanation | Status |
|---|---|---|---|
| Identity and authentication | Controller, model and security references exist | Shared authentication and session behavior is documented; route-level coverage remains | Partial |
| Fleet, vendors and drivers | Application, API and data references exist | Several features are described; each client and backend workflow is not fully traced | Partial |
| Marketplace and dispatch | API and workflow pages exist | Lifecycle and architecture references exist; per-endpoint contracts and edge cases remain | Partial |
| Trips | State-machine and application references exist | Core lifecycle is described; client-specific behavior and all persistence details need verification | Partial |
| Finance | Payment and billing references exist | Business concepts and some flows are described; ledger/API/data rules need further traceability | Partial |
| Corporate ETS | ETS references exist across applications and backend | Workflow documentation exists; implementation vs. proposals still needs reconciliation | Partial |
| Integrations | Provider and shared-service references exist | Configuration/failure behavior is described at a high level; live availability is not certified | Partial |
| Operations and deployment | Production Compose/Nginx, AWS/Cloudflare/Mobile workflows, health probes and EC2 bootstrap are source-mapped | Deployment paths and operational limitations are explained; live account state is not verified | Partial / Source-verified configuration |

## Inventory evidence and limitations

Repository audit recorded 44 API controller source files, 50 decorated
controller classes, 431 HTTP method decorators and 436 AST-derived
controller/method path variants, 75 Prisma models, 124 Next.js pages, 477
Flutter Dart files, 21 Marketing pages, 116 API `*.spec.ts` files, one API
`*.int-spec.ts`, nine shared-package Jest specs, 54 Flutter test files and
three standalone frontend Node regression files. These are discovery counts,
not coverage metrics. Decorator matches may not correspond one-to-one with
effective runtime routes, and file/test counts do not measure feature
completeness.

## Known gaps

- Endpoint documentation still needs per-route payload, response, validation,
  authorization, service, database and error details.
- Database reference needs a field-level dictionary with relationships and
  feature ownership.
- Frontend inventories need route-by-route user workflows and implementation
  traces.
- No Admin/Ops/Corporate or Marketing browser automation has been found;
  repeatable manual checks are documented in the
  [browser QA plan](./engineering/browser-qa-plan.md).
- Flutter test files exist, but CI has no Flutter test job or device matrix;
  see the [device matrix](./engineering/mobile-device-test-matrix.md).
- The API `test:e2e` script references a missing Jest configuration. The
  three frontend Node regression scripts are not wired into app package
  scripts or CI.
- No formal test-owner registry is checked in; the
  [coverage matrix](./engineering/test-coverage-matrix.md) marks suggested
  owners as recommendations.
- Docusaurus and Marketing checks have defined limits: Markdown link failures
  warn by default, and SEO errors are report-only unless strict mode is set.
- Provider availability, production credentials and production reachability
  require authorized environment checks; this repository documentation does
  not certify them.
- Documentation automation reconciles 30 Admin pages, 29 Ops pages,
  65 Corporate pages, 44 API controller files, 21 Marketing routes,
  75 Prisma models and both Flutter route constant maps. It proves
  source traceability, not end-to-end runtime behavior.
- Corporate SSO configuration needs environment and UI verification.
- Flutter SDK availability and local launch behavior depend on the target
  developer environment.
- No production backup/restore proof, verified restore target, DNS/certificate
  renewal process or named on-call rota was found; operations pages describe
  these as unverified or proposed rather than established practice.
- Legacy specifications and roadmaps need explicit implementation-status
  reconciliation.

## Sources and verification

- `apps/docs/docs/platform/internal/documentation-completion-implementation-plan.md` — detailed audit findings and phase scope.
- `apps/docs/docs/apps/` — current application and ETS documentation inventory.
- `apps/docs/docusaurus.config.ts` — documentation build and internal-content exclusion.
