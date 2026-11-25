---
title: Backend Utility Patterns
description: Shared guards, interceptors, filters, repositories and adapters used by the API.
---

# Backend Utility Patterns

**Evidence status:** Verified against `apps/api/src/common`,
`application`, `infrastructure` and provider adapters.

## Application Use Cases

The application directory contains three use-case classes:

| Use case | Responsibility | Source |
|---|---|---|
| `DispatchRequirementUseCase` | Moves a direct-dispatch requirement through its domain transition, builds 5/10 km H3 rings, asks driver/requirement ports for candidates, and audits the result. | `apps/api/src/application/marketplace/dispatch-requirement.use-case.ts` |
| `StartTripUseCase` | Checks assigned driver ownership and coordinates, applies the domain trip-start transition, saves it and records audit/realtime events. | `apps/api/src/application/trips/start-trip.use-case.ts` |
| `CompleteTripUseCase` | Checks that the authenticated driver owns the trip, applies completion/money rules, persists the trip and releases the driver. | `apps/api/src/application/trips/complete-trip.use-case.ts` |

Use cases use domain-core interfaces and application ports. They provide a
path for domain logic to remain independent of Prisma and HTTP concerns.
They are exported from `apps/api/src/application/index.ts`, but source search
found no controller/module registration or other API-source call site that
proves they are the active HTTP request path. The controllers currently
delegate to the feature services described in the
[module/service reference](../../apps/api/module-service-reference.md).

The standalone dispatch use case's `PrismaDriverRepository` currently ignores
the H3 cells passed to `findOnlineDriversInH3Cells` and selects at most 100
verified/available drivers. The code computes ring cells, but this repository
does not apply them; the standalone path therefore does not implement its
declared spatial filtering. The registered `DispatchService` is separate.

## Repositories

Prisma repository implementations exist for:

- Drivers
- Requirements
- Trips

They implement `IDriverRepository`, `IRequirementRepository` and
`ITripRepository`, map between Prisma rows and domain aggregates, and are
exported from `apps/api/src/infrastructure/index.ts`:

- `apps/api/src/infrastructure/repositories/prisma-driver.repository.ts`
- `apps/api/src/infrastructure/repositories/prisma-requirement.repository.ts`
- `apps/api/src/infrastructure/repositories/prisma-trip.repository.ts`

No Nest provider registration for these repository classes was found in the
API source tree. The broader runtime uses `DatabaseService` directly
throughout NestJS services; do not assume every active service goes through
these repository abstractions.

## Guards

| Utility | Purpose |
|---|---|
| `JwtAuthGuard` | Verify bearer token or live-stream ticket |
| `RolesGuard` | Enforce role decorators |
| `CorporateAccessGuard` | Enforce tenant/corporate resource scope |

Guards should return explicit unauthorized/forbidden failures. UI checks are
not a substitute for server guards.

## Interceptors

| Utility | Purpose |
|---|---|
| `TenantContextInterceptor` | Attach tenant context |
| `TransformInterceptor` | Wrap successful JSON responses |

Server-Sent Event responses bypass the JSON transform envelope.

## Filters

`HttpExceptionFilter` produces a consistent JSON error envelope and hides
internal server details for unhandled exceptions.

## Domain Errors

Shared domain errors represent invalid state transitions and business rule
violations. The HTTP filter recognizes invalid-state transitions and
controlled upstream failures.

## Utility Functions

Shared utilities include:

- bounded maps
- name and password utilities
- uniqueness helpers
- file sanitization
- token/stream-ticket support
- tenant context utilities

## Provider Adapters

Formal ports and provider adapters are present for Corporate route-time and
payout workflows. Other integrations use directly injected services or
direct HTTP calls; there is no universal provider-adapter layer. See the
[provider adapter reference](../../apps/api/provider-adapters.md).

Source adapters include:

- Google geocoding
- Google Routes
- Travel Matrix
- Traffic estimation
- Haversine fallback
- Payout providers

The payout and Corporate route/traffic adapters are registered through
provider tokens in the module. Razorpay calls are made directly by payment
and subscription services rather than through a shared provider port.
