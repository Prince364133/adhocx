---
title: Documentation Status
description: Status definitions and evidence rules for AdhocX documentation.
status: current
last_reviewed: "2026-11-23"
---

# Documentation Status

This page explains how to interpret the documentation status labels. A status
describes the strength and scope of the available documentation evidence; it
does not certify runtime behavior or production readiness.

## Status definitions

| Status | Meaning |
|---|---|
| Source-verified | The described behavior was checked against the named implementation or configuration source. This applies only to the behavior described, not automatically to every feature in that application. |
| Source-mapped | Routes, modules, data relationships or representative flows are linked to checked-in sources; runtime/provider behavior or exhaustive feature coverage may remain unverified. |
| Partial | Useful documentation exists, but important workflows, routes, error cases, or implementation links remain incomplete. |
| Inventory | Source-derived names or paths are listed, but the behavior and end-to-end implementation are not explained in enough detail to serve as a complete reference. |
| Not assessed | There is not enough current evidence to make a reliable completeness claim. |
| Planned | Describes proposed or future behavior; it is not evidence that the feature is implemented. |
| Historical | Records a dated audit, decision, incident, or prior program and should not be read as a statement of current behavior. |

## Evidence rules

- Application source, package manifests, configuration and migrations take
  precedence over specifications and older documentation.
- A listed route, controller, model, test or package proves that the item was
  found; it does not prove that its behavior is fully documented or tested.
- Distinguish observed implementation from interpretation, recommendations
  and planned work.
- Use a date for review metadata, not as a substitute for source evidence.
- When evidence is incomplete or conflicting, use **Partial** or
  **Not assessed** and describe the gap rather than guessing.

The [completion dashboard](./completion-dashboard.md) applies these labels to
the current documentation inventory. The [traceability registry](./traceability-registry.md)
assigns stable IDs and links source inventories, while the
[missing documentation report](./missing-documentation-report.md) tracks
unresolved gaps. Read the
[documentation standards](./engineering/documentation-standards.md) for
page-level requirements and the
[navigation ownership guide](./engineering/documentation-information-architecture.md)
for how pages are organized.

## Application status catalog

The stable IDs below are used in the registry and missing-item report. Status
is deliberately conservative: a route inventory is **Inventory**, while a
broader application reference is **Partial** until the user workflows and
implementation links are covered end to end.

| Stable ID | Application/domain | Overview status | Route/source inventory | Evidence |
|---|---|---|---|---|
| `APP-API` | API | Partial | Inventory | [Endpoint appendix](../apps/api/reference/exact-controller-endpoints.md); 44 controller files, 50 controller classes and 431 decorators |
| `APP-ADMIN` | Admin | Partial | Inventory | [Admin route inventory](../apps/admin/exact-route-inventory.md); 30 source pages |
| `APP-OPS` | Ops | Partial | Inventory | [Ops route inventory](../apps/ops/exact-route-inventory.md); 29 source pages |
| `APP-CORPORATE` | Corporate | Partial | Inventory | [Corporate route inventory](../apps/corporate/exact-route-inventory.md); 65 source pages |
| `APP-EMPLOYEE` | Employee App | Partial / Source-mapped | Source-mapped | [Commuter feature guide](../apps/employee-app/commuter-feature-guide.md), [110-route inventory](../apps/employee-app/exact-route-inventory.md), [route/screen catalog](../apps/employee-app/screen-component-catalog.md), [provider catalog](../apps/employee-app/state-provider-catalog.md) and [service/API matrix](../apps/employee-app/service-api-matrix.md); device/runtime and route-to-test evidence remain |
| `APP-MOBILE` | Mobile | Partial / Source-mapped | Source-mapped | [Application reference](../apps/mobile/application-reference.md), [172-constant route map](../apps/mobile/exact-route-inventory.md), [screen/component catalog](../apps/mobile/screen-component-catalog.md), [driver guide](../apps/mobile/driver-feature-guide.md), [vendor guide](../apps/mobile/vendor-feature-guide.md) and [service/API matrix](../apps/mobile/service-api-matrix.md); device/runtime and test evidence remain |
| `APP-MARKETING` | Marketing | Partial / Source-mapped | Source-mapped | [21-route page reference](../apps/marketing/detailed-page-reference.md), [component catalog](../apps/marketing/component-feature-catalog.md), [lead conversion guide](../apps/marketing/lead-conversion-guide.md), [SEO/publishing guide](../apps/marketing/seo-and-publishing-guide.md) and [route inventory](../apps/marketing/exact-page-inventory.md); deployed API behavior, public-claim validation and browser evidence remain |
| `APP-DOCS` | Documentation | Partial / Source-mapped | Partial | Docusaurus config, curated sidebar, [architecture reference](./architecture/index.md), [decision records](./architecture/decisions/index.md), status and governance; [declared deployment paths](./operations/deployment-overview.md) are source-mapped, but live hosting remains unverified |
| `DOMAIN-ETS` | ETS shared business domain | Partial / Source-mapped | Source-mapped | [Current-state overview](../apps/ets/current-state-overview.md), [implementation matrix](../apps/ets/implementation-status.md), [module/API map](../apps/ets/module-and-api-map.md), [workflow map](../apps/ets/operational-workflows.md), [historical archive](../apps/ets/historical-archive.md) and [roadmap archive](../apps/ets/roadmap-archive.md); deployed behavior and endpoint/test evidence remain |

## Source references

Repository-relative paths in each page's **Sources and verification** section
are the starting point for checking implementation. They identify evidence
locations; they are not permanent guarantees that the code has not changed.

## Sources and verification

- `apps/docs/docusaurus.config.ts` — public documentation boundary and Docusaurus configuration.
- `apps/docs/sidebars.ts` — curated navigation and visibility of public pages.
- `apps/docs/docs/platform/internal/documentation-completion-implementation-plan.md` — detailed audit findings and approved completion phases; excluded from the public site.
