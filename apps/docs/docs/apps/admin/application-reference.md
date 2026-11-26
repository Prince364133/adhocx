---
title: Admin Application Reference
description: Verified Next.js architecture and feature routes for the AdhocX control portal.
---

# Admin Application Reference

**Evidence status:** Verified against the Next.js package, root layout, shell
and App Router page inventory.

## Application

The Admin control portal is a Next.js 14 application running on port `7002`.
Its root layout wraps protected content in `AdminShell`.

`AdminShell`:

- redirects unauthenticated users to `/login`
- verifies the administrative session through the API
- provides a secure loading gate
- renders the sidebar, header and toast provider after verification

## Route Inventory

| Area | Routes |
|---|---|
| Authentication | `/login` |
| Dashboard | `/dashboard` |
| Vendor management | `/users` (currently renders the same vendor view as `/vendors`) |
| Vendors | `/vendors`, `/vendors/[vendorId]/fulfillment` |
| Companies | `/companies`, `/companies/[id]` |
| Drivers | `/drivers`, `/drivers/route-earnings` |
| Verifications | `/verifications` |
| Requirements | `/requirements/*` |
| Trips | `/trips/*` |
| Assignments | `/assignments/*` |
| Pricing | `/pricing`, detail, matrix, vendor and driver pricing |
| Finance | `/finance` |
| Settlements | `/settlements` |
| Coupons | `/coupons` |
| Blogs | `/blogs` |
| Notifications | `/notifications` |
| Feature flags | `/feature-flags` |
| Disputes | `/disputes` |
| Support | `/support` |
| Audit | `/audit` |
| Reports | `/reports` |

## Responsibilities

The Admin application is the platform governance surface for:

- Driver and vendor verification
- KYC review
- User and vendor lifecycle
- Requirements and trip supervision
- Finance and settlements
- Pricing and coupons
- Notifications and campaign management
- Feature flags
- Support and disputes
- Audit and reporting

## API Integration

The application includes `src/lib/api/client.ts`, with session storage,
session verification and API request helpers. Administrative session
verification is server-backed; browser state is not authorization evidence.

For verified per-page actions and API/service/data references, see the
[Admin route-by-route reference](./route-by-route-reference.md).
