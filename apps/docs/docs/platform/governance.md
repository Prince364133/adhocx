---
title: Documentation Governance
description: Ownership, review, versioning and update procedures for AdhocX documentation.
---

# Documentation Governance

**Evidence status:** Governance recommendation verified against repository
structure; ownership roles require organizational assignment.

## Source of Truth

Executable source code, package manifests and configuration take precedence
over historical Markdown specifications.

Documentation must distinguish:

- Verified implementation
- Partially verified implementation
- Needs investigation
- Not found
- Planned/not implemented

## Content Ownership

| Area | Responsible owner |
|---|---|
| Platform overview and glossary | Product architecture |
| API and backend | Backend engineering |
| Database and migrations | Backend/data engineering |
| Corporate portal | Corporate frontend and product |
| Employee app | Mobile engineering |
| Mobile app | Mobile engineering |
| Admin and Ops | Web operations engineering |
| Marketing | Marketing engineering |
| Security | Security and backend |
| Deployment | DevOps/platform |
| Testing | QA and engineering |
| User guides | Product operations/support |

Named individuals or team aliases should be assigned per repository owner
process before this becomes an operational ownership directory.
The role in this table is the evidence owner for its area: it is responsible
for checking the cited source and implementation status, not merely editing
prose. Until teams assign names or aliases, the table is a responsibility map,
not an escalation directory.

## Review Cadence

Review documentation:

- with every application architecture change
- with every API or database breaking change
- when authentication/authorization roles change
- before production deployment
- after incidents with runbook impact
- at least quarterly for stale product/specification content

The documentation check flags dated public pages that have not been reviewed
within 90 days. Pages without `last_reviewed` metadata are reported as a
backlog warning rather than silently treated as fresh; add the date when
creating or substantially revising a page.

## Change Rules

Documentation changes should:

- include evidence/source paths
- keep the page's GitHub edit link pointed at the source branch/file
- update cross-links and navigation
- remove or label outdated roadmap language
- avoid secret values
- update the coverage matrix for a new application/module/feature
- run `pnpm --filter @adhocx/docs check:docs`, typecheck and the Docusaurus
  production build

## Versioning

Use source control as documentation history. Stable current-state pages should
retain frontmatter titles and descriptions. Historical plans should remain
under `internal` or roadmap categories and should not be presented as active
behavior.

Architecture decisions follow the
[ADR and decision-log process](./architecture/decisions/adr-process.md).
An ADR records a source-backed decision and its consequences; the
[decision changelog](./architecture/decisions/changelog.md) records additions,
status changes and supersession. Do not invent meeting history or decision
intent when only current source behavior is known.

## Decommissioning

When a page or API route is removed:

1. Add a redirect or replacement link.
2. Update all inbound cross-links.
3. Add a deprecation notice if migration time is needed.
4. Remove obsolete content after the deprecation period.

## Internal vs Public

Internal audits, plans and sensitive operational material must remain under
`**/internal/**`, which is excluded from the public Docusaurus build. The
public-doc secret check detects selected credential formats but is a guardrail,
not a substitute for repository-wide secret scanning or review.
