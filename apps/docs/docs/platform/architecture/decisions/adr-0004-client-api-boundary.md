---
title: ADR-0004 — Client and API Boundary
description: Record of the shared API boundary for application business data.
status: accepted-current-architecture
last_reviewed: "2026-11-23"
---

# ADR-0004: Client and API Boundary

- **Status:** Accepted as the current architecture record
- **Decision recorded:** 2026-11-23
- **Supersedes:** None

## Context

Admin, Ops, Corporate, Mobile and Employee App contain API clients that call
the shared `/api/v1` service. Marketing also calls public API endpoints for
lead capture. The API owns the corresponding controllers, business services
and database access.

## Decision

Treat the shared API as the primary frontend-to-business-data boundary.
Frontend applications should use their API clients and server contracts
rather than connecting to PostgreSQL or Redis directly.

This is not a claim that every frontend interaction is mediated by the
AdhocX API. Direct third-party integrations exist in some client code; those
must be documented as exceptions and assessed separately.

## Source-grounded consequences

- A UI feature's documented flow should identify its actual API helper,
  controller and downstream service where those paths exist.
- Client presence or a URL constant alone does not prove a successful
  end-to-end integration.
- Deployment hostnames and client base URLs must be taken from the relevant
  deployment/build configuration, not inferred from this boundary.

## Evidence

Representative client references include `apps/admin/src/lib/api/`,
`apps/ops/src/lib/api/`, `apps/corporate/src/lib/api/`,
`apps/mobile/` and `apps/employee-app/`; backend evidence is under
`apps/api/src/` and `apps/api/src/main.ts`.
