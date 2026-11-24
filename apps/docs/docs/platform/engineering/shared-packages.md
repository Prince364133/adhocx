---
title: Shared Packages
description: Shared workspace libraries and supporting tooling in the AdhocX monorepo.
---

# Shared Packages

## Contracts Package

`@adhocx/contracts` provides TypeScript:

- Authentication DTOs
- Driver, vendor and trip DTOs
- Payment and settlement DTOs
- Notification DTOs
- Corporate tenant, roster, routing and safety DTOs
- Shared enums
- State-machine validation

Consumers include the NestJS API and Next.js applications. Flutter
applications do not compile this TypeScript package directly and maintain
Dart-side models/repositories.

## Domain Core Package

`@adhocx/domain-core` provides pure TypeScript domain models:

- Authentication aggregates
- Fleet driver/vehicle aggregates
- Marketplace requirements
- Dispatch offers and events
- Trip aggregates and events
- Finance ledgers and settlements
- Corporate invoice, roster and route aggregates
- Notification dispatch models
- DDD common entities and value objects

It is not an independent runtime service.

## Config Package

`@adhocx/config` provides shared monorepo TypeScript configuration metadata
and is referenced through workspace tooling.

## Scripts and Supporting Tooling

The repository includes scripts for:

- Dependency preparation
- Database seeding and cleanup
- Dispatch simulations
- Pricing and wallet tests
- Mobile UI and asset audits
- Master WBS generation
- Link and emoji checks
- App/server smoke tests
- End-to-end and load test helpers

Supporting scripts are operational tooling, not deployable applications.
