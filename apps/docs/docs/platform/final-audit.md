---
title: Historical Documentation Audit Snapshot
description: Scope and limitations of the earlier documentation audit and build validation.
status: historical
last_reviewed: "2026-11-23"
---

# Historical Documentation Audit Snapshot

This page records the scope of the earlier documentation program. It is not
a certification that every application route, feature, API contract or data
model has a complete explanation. A later repository-wide audit identified
the route-level and end-to-end gaps summarized in the
[completion dashboard](./completion-dashboard.md).

## Earlier program deliverables

| Area | Earlier deliverable record | Current interpretation |
|---|---|---|
| Repository discovery | Eight runnable workspaces and shared packages inventoried | Inventory is useful; detailed behavior coverage is still incomplete |
| Architecture and applications | Overview and architecture pages added for major applications | Pages vary in depth; see the dashboard and application references |
| API and database | Controller, endpoint and Prisma model inventories added | Inventories do not replace endpoint contracts or a field-level data dictionary |
| Security and workflows | Shared security and business workflow references added | Important behavior is described, but complete per-route traces remain |
| Development and operations | Setup, testing, deployment and user-guide pages added | Commands and environment-specific behavior still require ongoing verification |
| Docusaurus validation | Production builds were recorded as passing during the earlier program | A successful build validates documentation generation and configured links, not completeness or runtime behavior |

## Validation boundaries

A Docusaurus production build can detect build errors and configured broken
links. It does not prove:

- application behavior matches every explanation;
- all source routes, DTOs, service rules or database effects are documented;
- production providers, credentials or external services are available;
- browser or device workflows pass in every supported environment.

## Maintenance

Use the [documentation status](./documentation-status.md) definitions when
updating coverage. Do not mark broad domains complete based only on an
inventory, a build, or the existence of an overview page. Record evidence at
the route, feature or data level where the claim is made.

## Sources and verification

- `apps/docs/docs/platform/internal/progress/MASTER_PROGRESS_TRACKER.md` — historical phase deliverables and validations.
- `apps/docs/docs/platform/internal/documentation-completion-implementation-plan.md` — follow-up audit and current phased completion plan.

## Final Phase 16 audit

The final audit added governance and automation rather than treating existing
source inventories as runtime certification.

| Audit area | Final result | Remaining limitation |
|---|---|---|
| Runnable applications | Eight workspaces were classified; ETS is a shared domain | Live deployment and provider behavior remain unverified |
| Next.js routes | 124 source pages reconcile across Admin, Ops and Corporate | Browser/runtime, field validation and test evidence remain partial |
| API controllers | 44 source files, 50 classes and 431 method decorators are represented | Nested service calls, runtime Swagger and provider outcomes remain partial |
| Prisma database | 75 models and 42 enums reconcile to the field-level dictionary | Live rows, drift and deployed migration state were not introspected |
| Flutter routes | Mobile 172 constants and Employee 131 constants reconcile | Device/runtime, route-to-test and client/server gaps remain |
| Marketing | 21 Astro/TypeScript route files reconcile | Deployed API, privacy/claim review and browser evidence remain open |
| Operations | Compose, Nginx, workflows and health/runbooks are source-mapped | Live secret, backup/restore, DNS/certificate and on-call verification remain open |
| Documentation automation | Governance check, source coverage, stale metadata, secret and Mermaid guards pass locally | It does not certify content correctness or runtime completeness |

The documentation check is wired into CI as a dedicated job. Named organizational
owners remain to be assigned outside the repository. No production deployment,
database migration, secret change, backup/restore or live provider call was
performed during this documentation program.
- `apps/docs/docusaurus.config.ts` — build configuration and excluded internal content.
