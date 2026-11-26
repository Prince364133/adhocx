---
title: Admin
---

# Admin

## Functional Perspective

The Admin Control Portal gives authorized platform staff one place to
govern marketplace supply, corporate tenants, compliance, finance and support.
It is designed for privileged operational decisions and reporting.

## Technical Perspective

Next.js 14 App Router starts at `apps/admin/src/app/layout.tsx`. The
`AdminShell` verifies an administrative session with the API before revealing
protected navigation. Pages use `src/lib/api/client.ts` for bearer-token
requests and update React state from API success/error responses.

## Verified documentation

- [Admin application reference](./application-reference.md)
- [Detailed route and feature reference](./detailed-reference.md)
- [Admin route-by-route reference](./route-by-route-reference.md)
- [Exact route inventory](./exact-route-inventory.md)
- [Super Admin and trips/ride management specification](../ets/applications/admin/10_SUPER_ADMIN_AND_TRIPS_RIDE_MANAGEMENT_PANEL.md)

