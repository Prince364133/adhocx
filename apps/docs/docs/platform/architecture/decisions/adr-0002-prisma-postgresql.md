---
title: ADR-0002 — Prisma and PostgreSQL
description: Record of the API-owned relational persistence boundary.
status: accepted-current-architecture
last_reviewed: "2026-11-23"
---

# ADR-0002: Prisma and PostgreSQL

- **Status:** Accepted as the current architecture record
- **Decision recorded:** 2026-11-23
- **Supersedes:** None

## Context

The API imports a shared database module, uses Prisma client services for
application persistence, and checks in its Prisma schema and migrations.
Local and production Compose manifests declare PostgreSQL; the production
image uses the API process to access it.

## Decision

Treat PostgreSQL as the persistent relational store and Prisma as the API
data-access boundary. Frontend workspaces call API routes rather than
connecting directly to the database.

## Source-grounded consequences

- Schema and migrations document the repository's expected data model; they
  do not prove the live database is at that version.
- Database reads and writes should be described through the API's services
  and Prisma access paths.
- PostGIS extensions are declared in deployment/schema assets where present;
  that does not imply every feature uses spatial SQL.

## Evidence

`apps/api/src/database/database.module.ts`,
`apps/api/src/database/database.service.ts`,
`apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`,
`docker-compose.yml` and `docker-compose.prod.yml`.

This record captures the current source architecture, not an original
technology-selection rationale.
