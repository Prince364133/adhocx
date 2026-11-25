---
title: Browser QA Plan
description: Repeatable manual browser checks for AdhocX web applications and the Docusaurus site.
---

# Browser QA Plan

**Status:** Proposed manual acceptance plan. Repository audit found no
Playwright, Cypress, WebDriver or equivalent browser-test configuration for
the web applications. Run this plan against an approved local or preview
environment; it is not evidence that the journeys have already passed.

## Local entry points

Ports below come from the application package scripts. API-dependent journeys
also require a suitable API and test data; use the local-development and
environment-configuration guides rather than production credentials.

| Application | Start command | Local address | Source-grounded route reference |
|---|---|---|---|
| Admin | `pnpm dev:admin` | `http://localhost:7002` | [Admin route-by-route reference](../../apps/admin/route-by-route-reference.md) |
| Ops | `pnpm dev:ops` | `http://localhost:7004` | [Ops route-by-route reference](../../apps/ops/route-by-route-reference.md) |
| Corporate | `pnpm dev:corporate` | `http://localhost:7006` | [Corporate route reference](../../apps/corporate/detailed-route-reference.md) |
| Marketing | `pnpm dev:marketing` | `http://localhost:4321` | [Marketing page reference](../../apps/marketing/detailed-page-reference.md) |
| Documentation | `pnpm dev:docs` | `http://localhost:7007` | [Documentation home](../../index.md) |

Use seeded, non-production accounts with the least privilege needed for each
journey. Record the test environment, commit, browser/version, role, scenario,
result, and any screenshot or redacted console/network evidence. Never attach
tokens, personal data, provider secrets, or production customer data.

## Browser and viewport policy

The repository does not declare a supported-browser matrix. Until Product or
Release owners record one, use the following as a **proposed smoke set**, not
as a source-backed support promise:

| Smoke target | Suggested check |
|---|---|
| Current stable Chromium desktop | Primary interactive workflow, responsive layout, console/network failures |
| Current stable Firefox desktop | Authentication, navigation, forms, tables and key role permissions |
| Current stable Safari on macOS/iOS, when supported by the release target | Authentication, layout, forms, maps/embedded content and browser-specific behavior |
| Narrow phone viewport in a desktop browser | Navigation collapse, modal overflow, dense tables, empty/error/loading states |

The final supported browser/OS versions and release-blocking policy require
an explicit product decision; do not infer them from these recommendations.

## Critical journey checklist

| Application | Functional browser checks | Failure and authorization checks | Evidence reference |
|---|---|---|---|
| Admin | Sign in; navigate the main management areas; create/update a representative record; verify saved values after reload; exercise search/filter and form validation | Unauthenticated/unauthorized access; invalid input; API timeout/error; empty results; destructive-action confirmation | [Admin routes](../../apps/admin/route-by-route-reference.md), [exact route inventory](../../apps/admin/exact-route-inventory.md) |
| Ops | Open operational dashboard; inspect a route and its stops; use planner/route actions appropriate to the route status; inspect live map and SOS alert lifecycle | Verify action buttons follow route status; distinguish active from terminal SOS alerts; test no-data/stale-data and API-error states; verify role limits | [Ops routes](../../apps/ops/route-by-route-reference.md), [live operations guide](../../apps/ops/live-operations-runbook.md), [SOS/reassignment guide](../../apps/ops/sos-and-reassignment-guide.md) |
| Corporate | Sign in as a tenant-scoped user; review dashboard, employees, offices, rosters, routes and billing views; submit one safe representative change; verify tenant-scoped results | Test an account without the required role/tenant; check tenant isolation; verify form/API errors. The audited nested `/live/**`, `/bookings/**`, `/rosters/**` and `/safety/**` layouts redirect to `/dashboard`, so do not mark those paths as reachable success flows | [Corporate routes](../../apps/corporate/detailed-route-reference.md), [workflow reference](../../apps/corporate/workflow-reference.md), [permissions guide](../../apps/corporate/permissions-and-workflows.md) |
| Marketing | Visit all public route families; test header/footer links, mobile navigation, lead-form required fields, consent/validation feedback and success/error presentation | Use an approved test API only; verify API outage/validation errors without submitting real leads. The documented form/DTO mismatch is an open implementation concern, not something a browser pass should conceal | [Marketing pages](../../apps/marketing/detailed-page-reference.md), [lead conversion](../../apps/marketing/lead-conversion-guide.md), [SEO and publishing](../../apps/marketing/seo-and-publishing-guide.md) |
| Docusaurus | Open key platform/application pages; follow in-site links; inspect Mermaid diagrams in light/dark mode; check narrow layout, code blocks, tables and keyboard navigation | Inspect build output for broken-Markdown warnings, missing anchors, clipped diagrams and console errors | [Documentation home](../../index.md), [architecture diagrams](../architecture/index.md) |

## Execution sequence

1. Build the target application and confirm the test API/data prerequisites.
2. Record environment, commit, browser/version, viewport and test account role.
3. Execute the happy-path checklist once with a clean test record.
4. Repeat with invalid input, missing permissions, empty state and controlled
   API failure where the environment supports safe fault simulation.
5. Reload or revisit the affected view to confirm persisted state and
   navigation behavior.
6. Record pass/fail, actual result, evidence link and any issue reference.
7. Clean only the test records created for the run.

Do not use production for destructive CRUD, SOS generation, lead submission
or fault injection unless the environment owner explicitly approves a
production-safe test protocol.

## Automation follow-up

No browser automation suite is currently established for these applications.
If one is adopted, keep browser tests isolated from production credentials,
use a non-production API/database, and encode role/tenant boundaries as
negative tests. A future test suite should cover the same workflows in the
[coverage matrix](./test-coverage-matrix.md) and be invoked by CI rather than
remaining as an undocumented local-only check.
