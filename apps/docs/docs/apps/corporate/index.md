---
title: Corporate
---

# Corporate

## Functional Perspective

The Corporate Portal lets tenant transport staff manage employees, rosters,
routes, bookings, live commutes, safety and billing in tenant scope.

The source contains page implementations for these areas, but live,
bookings, rosters, and safety routes are currently redirected to the dashboard
by their nested layouts. See the exact route inventory for the real runtime
behavior; do not assume every page file is currently reachable.

## Technical Perspective

Next.js 14 starts from `apps/corporate/src/app/layout.tsx`. `PortalShell`
and `SessionProvider` hold authenticated tenant/office/role state.
`src/lib/api/corporate.ts` calls `/auth/*` and `/corporate/*` API endpoints.

Corporate app documentation is grouped with the unified ETS specifications.

- [Corporate application architecture](./architecture.md)
- [Corporate route inventory](./route-inventory.md)
- [Corporate route-by-route reference](./detailed-route-reference.md)
- [Exact route inventory](./exact-route-inventory.md)
- [Corporate frontend API reference](./api-reference.md)
- [Corporate end-to-end workflows](./workflow-reference.md)
- [Corporate portal troubleshooting](./troubleshooting.md)
- [Corporate permissions and workflows](./permissions-and-workflows.md)
- [ETS master plan](../ets/overview/00_MASTER_PLAN_CORPORATE_ETS.md)
- [Corporate client portal](../ets/applications/corporate-portal/07_CORPORATE_CLIENT_PORTAL_SPECIFICATION.md)
- [Roster ingestion](../ets/backend/rosters/02_ROSTER_INGESTION_AND_EXCEL_IMPORT_ENGINE.md)
