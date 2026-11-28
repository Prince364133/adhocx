---
title: Fleet
description: Functional and technical documentation for the AdhocX Fleet Portal frontend, centralized FleetDomainModule REST APIs, business rules, database schema, and testing/simulation architecture.
last_reviewed: "2026-11-27"
---

# Fleet

**Evidence status:** Phases 1–6 are complete and verified: shared contracts (`packages/contracts`), Prisma schema & migration (`20261127000000_adhocx_fleet_portal`), centralized `FleetDomainModule` Portal APIs (`apps/api/src/domains/fleet/portal/` for Auth, Fleet Code, Dashboard, Drivers, Live Operations, Earnings/Payouts, Shortfall claims, Incentives, feature-flagged Shifts, Support Center, and Notifications covering all 10 `FleetNotificationEventType` events), Driver Fleet Code association, `GET /api/v1/drivers/me/incentives` & earnings redaction (`apps/api`), trip/KYC/auth notification hooks, `apps/fleet` pages (port `7008`), 12-case HTTP Supertest matrix, repeatable simulation scripts, Vitest unit specs, load/concurrency & cross-tenant penetration tests, Playwright E2E scripts, and live headless Chrome rendering checks.

## Functional Perspective

The **AdhocX Fleet Portal** lets Fleet Owners, Fleet Administrators, and authorized Fleet Managers manage drivers associated with their fleet, monitor live activity, review permitted trip and driver-wise earnings, request payouts, configure driver targets and incentives, contact AdhocX support, and receive fleet-scoped notifications.

Every operational surface is strictly isolated to the signed-in user's `fleetId`. Fleet drivers continue using the existing AdhocX Driver app and receive trips through the standard AdhocX dispatch engine without seeing normal trip earnings.

## Technical Perspective

- **Frontend workspace:** `apps/fleet` (Next.js 14 App Router, React 18, TypeScript, `@adhocx/ui`, `@adhocx/contracts`, port `7008`)
- **Backend bounded context (centralized DDD monorepo API):** `apps/api/src/domains/fleet/` (`FleetDomainModule` inside `@adhocx/api`, serving `/api/v1/fleet/*`)
- **Shared contracts:** `packages/contracts/src/dtos/fleet-portal/` and `packages/contracts/src/enums/index.ts`
- **Core schema & migration:** `Fleet`, `FleetDriverHistory`, `FleetAdminUser`, `FleetPayoutRequest`, `FleetShortfallRecord`, `FleetIncentive`, `FleetIncentiveProgress`, `FleetSupportTicket`, `FleetSupportMessage`, `FleetNotification`, and `FleetShift` in `apps/api/prisma/schema.prisma` (`20261127000000_adhocx_fleet_portal`)

## Documentation Map

- [Business logic and rules](./business-logic-and-rules.md)
- [Fleet architecture](./architecture.md)
- [Database schema and models](./database-schema.md)
- [API contract reference](./api-reference.md)
- [Frontend route inventory](./frontend-route-inventory.md)
- [Permissions and security](./permissions-and-security.md)
- [Testing and simulations](./testing-and-simulations.md)
