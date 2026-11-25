---
title: Documentation Completion Dashboard
description: Evidence-based snapshot of AdhocX documentation coverage and remaining work.
status: current
last_reviewed: "2026-11-23"
---

# Documentation Completion Dashboard

This dashboard is a coverage snapshot, not a claim that every route or feature
has a complete reference. The earlier documentation program produced broad
inventories and architecture pages; the subsequent audit found that many
route-level and end-to-end explanations still need implementation detail.
Use the [status definitions](./documentation-status.md) when reading the
labels below.

## Application coverage

| Application or domain | Existing documentation | Status | Main remaining work |
|---|---|---|---|
| API | Architecture, bounded contexts, module/service maps, provider adapters, AST-derived controller pages, DTO catalog, conventions, errors, webhooks and troubleshooting | Partial / Inventory | Complete exact per-route downstream call/data effects and route-specific runtime/test evidence |
| Admin | Application overview, route-by-route functional/technical reference, route inventory | Partial / Source-mapped | Verify runtime URLs and remaining field-level validation/audit/test evidence |
| Ops | Application overview, source-mapped 29-route reference, live operations runbook, SOS/reassignment guide and route inventory | Partial / Source-mapped | Runtime URL confirmation, remaining endpoint-specific validation/audit/data evidence and test mapping |
| Corporate | Architecture, 65-route functional/technical reference, API reference, workflow guide, troubleshooting, permissions and exact route inventory | Partial / Source-mapped | Runtime URL and endpoint-specific validation/test evidence remain; four nested layouts currently block their route families |
| Employee App | Architecture, commuter feature guide, 110-path/21-alias route map, screen catalog, provider catalog, service/API matrix and boarding/safety guide | Partial / Source-mapped | Verify device/runtime behavior, complete route-to-test mapping and address documented client/server gaps |
| Mobile | Application architecture, 172-constant route map (107 canonical paths, 65 aliases), driver and vendor feature guides, screen/component catalog, service/API matrix and compliance reference | Partial / Source-mapped | Runtime/device test evidence remains; Corporate ETS driver screens are present in source but are not registered in the audited app router |
| Marketing | 21-route functional/technical reference, shared/interactive component catalog, lead conversion guide, SEO/publishing guide and application architecture | Partial / Source-mapped | Verify deployed API behavior and hosting output; resolve documented form/API mismatch, review public claims/privacy requirements, and add browser/runtime evidence |
| Documentation | Docusaurus overview, standards, navigation, status and governance | Partial | Maintain source traceability, curated navigation and this coverage record |
| ETS domain | Current-state overview, implementation status matrix, current module/API and workflow maps, plus separated historical and roadmap indexes | Partial / Source-mapped | Verify production/provider behavior and complete remaining endpoint/test evidence; the documented historical/planned boundary is in place |
| System architecture | Source-mapped context/container/deployment/component views, selected request and GPS sequences, ETS ERD, diagram guide and four ADRs | Partial / Source-mapped | Confirm runtime deployment/provider details and expand only when new source evidence or a material architectural change requires it |

ETS is a shared business domain, not an additional runnable application.

## Cross-cutting coverage

| Area | Inventory evidence | Documentation status | Remaining verification |
|---|---|---|---|
| API controllers and routes | Reconciled: 44 source files, 50 controller classes, 431 method decorators and 436 AST-derived path variants | Partial | Complete downstream behavior, runtime URL verification, provider behavior and tests for each endpoint |
| Database | Reconciled: 75 models, 42 enums, 1,272 fields, 220 relation fields, 157 model-level key/index declarations and 33 migration directories | Source-verified for checked-in schema/migrations; live DB state not assessed | Trace exact route-to-model effects; verify deployed migration state only with authorized database access |
| Next.js applications | Reconciled: 124 route page files (Admin 30, Ops 29, Corporate 65); all three applications have source-mapped route references | Source-mapped / Partial | Verify deployed runtime behavior and remaining endpoint-specific validation, audit and test evidence |
| Flutter applications | Reconciled: 217 canonical path constants (Mobile 107, Employee 110) plus 86 named aliases; both apps have route/screen and feature/API source maps | Source-mapped / Partial | Verify runtime/device behavior, route-to-test coverage and documented client/server gaps for both apps |
| Marketing | Reconciled: 21 Astro/TypeScript page and endpoint files; route, component, lead, blog and SEO paths source-mapped | Partial / Source-mapped | Verify deployed API contract, static build environment, production SEO behavior and browser evidence |
| Tests | 116 API `*.spec.ts`, one API `*.int-spec.ts`, nine shared-package specs, 54 Flutter test files, and three Admin/Ops/Corporate Node regression files | Source-verified inventory / Partial coverage | [QA overview](./engineering/testing-overview.md), [coverage matrix](./engineering/test-coverage-matrix.md), [browser plan](./engineering/browser-qa-plan.md), [device matrix](./engineering/mobile-device-test-matrix.md) and [runbook](./engineering/test-execution.md); automated browser/device tests, exact route-to-test mapping, formal owners and runtime results remain gaps |
| Operations and deployment | Production Compose, Nginx routing, GitHub Actions deployment/release workflows, health probes, migration verifier and EC2 bootstrap are source-mapped | Partial / Source-verified configuration | Live cloud state, secret provisioning, migration safety, backup/restore, DNS/certificate renewal and on-call ownership remain unverified; see the operations runbooks |

Source counts reflect Phase 2 reconciliation, corrected during Phase 3, and
can change with code. They are inventory evidence, not completion measures.
The AST-based 436 API path variants are not runtime introspection results.

The detailed [traceability registry](./traceability-registry.md) maps feature
groups to frontend route inventories, API controllers/services and database
models. The [missing documentation report](./missing-documentation-report.md)
lists remaining work by stable ID and planned phase.

## Program state

The earlier 20-phase documentation program delivered a broad foundation. Its
tracker records that program's deliverables and production-build validations;
it does not certify the deeper route, API, database or feature coverage now
identified as incomplete. The current work is governed by the internal
documentation completion implementation plan, which is intentionally
excluded from the public site. Phases 1–16 are complete. The final phase added
source-edit links, governance and ADR procedures, route/API/data coverage
checks, Mermaid and secret guards, and CI documentation validation. Unverified
runtime, provider, device, backup and live infrastructure behavior remains
explicitly open.

## How to use this dashboard

1. Start with the relevant application or platform page.
2. Follow its implementation paths to the source of truth.
3. Treat inventories as discovery aids, not behavior specifications.
4. Record route-, feature-, API- or data-level gaps before marking content
   source-verified.
5. Revisit this dashboard when an approved phase adds or validates coverage.

## Sources and verification

- `apps/docs/docs/platform/internal/documentation-completion-implementation-plan.md` — audit inventory and remaining work.
- `apps/docs/docs/apps/` — public application and ETS reference pages.
- `apps/docs/docs/platform/coverage-matrix.md` — detailed topic-level coverage notes.
- `apps/docs/docs/platform/internal/progress/MASTER_PROGRESS_TRACKER.md` — historical record of the earlier documentation program.
