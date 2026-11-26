---
title: Architecture Reference
description: Entry point to AdhocX system, container, deployment, component, data and decision references.
status: source-mapped
last_reviewed: "2026-11-23"
---

# Architecture Reference

This section explains the current system boundaries and source-level
architecture. Diagrams describe repository evidence and declared deployment
configuration; they do not certify production availability or runtime
configuration.

## Architecture views

- [System context](./system-context.md) — users, applications and integration
  boundaries.
- [Container architecture](./container-model.md) — workspace applications,
  shared API and data-service responsibilities.
- [Deployment and API components](./deployment-and-components.md) — the
  production Compose topology and a source-level Corporate API component
  view.
- [Data and control flow](./data-and-control-flow.md) — protected HTTP
  requests, corporate GPS/live-map flow and a selected ETS ERD.
- [Diagram style guide](./diagram-style-guide.md) — conventions for keeping
  diagrams accurate and reviewable.

## Decision records

- [Architecture decision records](./decisions/index.md) — current
  source-observed architecture decisions and their limits.
- [Decision changelog](./decisions/changelog.md) — index of the records added
  to document the current architecture baseline.

## Evidence boundary

The primary implementation references are `apps/api/src/main.ts`,
`apps/api/src/app.module.ts`, domain modules, `apps/api/prisma/schema.prisma`,
`docker-compose.yml`, `docker-compose.prod.yml` and
`infrastructure/nginx/production.conf`. A diagram should be updated when
these sources or the application manifests change. Missing deployment
configuration is called out rather than inferred.
