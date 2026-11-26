---
title: ADR-0001 — NestJS Modular Monolith
description: Record of the API's current single-process NestJS module architecture.
status: accepted-current-architecture
last_reviewed: "2026-11-23"
---

# ADR-0001: NestJS Modular Monolith

- **Status:** Accepted as the current architecture record
- **Decision recorded:** 2026-11-23
- **Supersedes:** None

## Context

The API source has one Nest bootstrap and one root `AppModule`. The root
imports identity, fleet, marketplace, dispatch, trip, finance, platform and
corporate domain modules. The Docker configuration builds and runs one API
image.

## Decision

Document and operate the checked-in API as one modular monolith. Domain
modules provide code organization and dependency boundaries; do not draw or
describe them as independent network services unless deployment artifacts
change.

## Source-grounded consequences

- API module calls occur in-process; HTTP service boundaries exist at the
  shared API edge, not between every domain module.
- A module import or exported provider is evidence of code wiring, not proof
  that every endpoint or workflow is complete.
- Future extraction into separate services would require a new decision and
  deployment evidence.

## Evidence

`apps/api/src/main.ts`, `apps/api/src/app.module.ts`,
`apps/api/src/domains/index.ts` and `apps/api/Dockerfile`.

This ADR records the current structure. It does not assert why the original
architecture was selected or that a historical approval record exists.
